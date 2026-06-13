import { prisma } from "@/lib/prisma";
import {
  gmailForUser,
  getCompactThread,
  listThreadIds,
  NeedsReconnectError,
  type CompactThread,
} from "@/lib/gmail";
import { classifySensitivity, triageThreads } from "@/lib/ai";
import { reconcile } from "@/lib/reconcile";

export interface ScanResult {
  status: "ok" | "needs_reconnect";
  threadsScanned: number;
  actionItems: number;
  sensitive: number;
}

/**
 * Per-user scan pipeline (CLAUDE.md §"Scan pipeline").
 * Never persists raw bodies; sensitive threads bypass Pass B and are stored
 * title-only. Raw thread content lives only in memory for the duration of this
 * function.
 */
export async function scanUser(userId: string): Promise<ScanResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User ${userId} not found`);

  let gmail;
  try {
    gmail = await gmailForUser(userId);
  } catch (err) {
    if (err instanceof NeedsReconnectError) {
      return { status: "needs_reconnect", threadsScanned: 0, actionItems: 0, sensitive: 0 };
    }
    throw err;
  }

  // Include threads of still-open action items so they can roll over / resolve.
  const openItems = await prisma.actionItem.findMany({
    where: { userId, status: "open" },
    select: { threadId: true },
  });
  const openThreadIds = openItems
    .map((i) => i.threadId)
    .filter((id): id is string => Boolean(id));

  const threadIds = await listThreadIds(gmail, openThreadIds);
  const threads: CompactThread[] = [];
  for (const id of threadIds) {
    try {
      threads.push(await getCompactThread(gmail, id));
    } catch {
      // One bad thread never sinks the scan.
    }
  }

  // Pass A — sensitivity classification FIRST. Flagged threads bypass Pass B.
  const sensitiveThreads: { threadId: string; title: string }[] = [];
  const safeThreads: CompactThread[] = [];
  for (const t of threads) {
    let flagged = false;
    try {
      const { sensitive } = await classifySensitivity(t);
      flagged = sensitive;
    } catch {
      // On classifier failure, fail safe: treat as sensitive (no leakage).
      flagged = true;
    }
    if (flagged) {
      sensitiveThreads.push({ threadId: t.threadId, title: "🔒 Confidential matter" });
    } else {
      safeThreads.push(t);
    }
  }

  // Pass B — triage + synthesis over non-sensitive threads only.
  const todayIso = new Date().toISOString().slice(0, 10);
  const triage = await triageThreads(safeThreads, todayIso);

  const lastSenderByThread: Record<string, string> = {};
  for (const t of threads) lastSenderByThread[t.threadId] = t.lastSender;

  const { upserts, autoResolvedThreadIds } = reconcile({
    aiActionItems: triage.actionItems,
    sensitiveThreads,
    openThreadIds,
    lastSenderByThread,
    userEmail: user.email,
  });

  // Persist: upsert items by (userId, threadId); auto-resolve replied threads.
  for (const item of upserts) {
    await prisma.actionItem.upsert({
      where: { userId_threadId: { userId, threadId: item.threadId } },
      create: { userId, ...item },
      update: {
        title: item.title,
        summary: item.summary,
        waitingOn: item.waitingOn,
        deadline: item.deadline,
        priority: item.priority,
        sensitive: item.sensitive,
        recommendedStep: item.recommendedStep,
        replyToMessageId: item.replyToMessageId,
      },
    });
  }

  if (autoResolvedThreadIds.length > 0) {
    await prisma.actionItem.updateMany({
      where: { userId, threadId: { in: autoResolvedThreadIds }, status: "open" },
      data: { status: "auto_resolved", resolvedAt: new Date() },
    });
  }

  // Persist the digest (FYI + calendar candidates + stats for the push copy).
  await prisma.digest.create({
    data: {
      userId,
      date: new Date(),
      fyi: triage.fyi,
      calendar: triage.calendarItems,
      stats: {
        actionItems: upserts.length,
        sensitive: sensitiveThreads.length,
        threadsScanned: threads.length,
      },
    },
  });

  return {
    status: "ok",
    threadsScanned: threads.length,
    actionItems: upserts.length,
    sensitive: sensitiveThreads.length,
  };
}

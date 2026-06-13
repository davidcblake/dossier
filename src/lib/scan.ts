import { prisma } from "@/lib/prisma";
import {
  gmailForUser,
  getCompactThread,
  getReplyTarget,
  createDraft,
  listThreadIds,
  NeedsReconnectError,
  type CompactThread,
} from "@/lib/gmail";
import {
  classifySensitivity,
  triageThreads,
  generateDraft,
  reflectProfile,
} from "@/lib/ai";
import { reconcile } from "@/lib/reconcile";

// Cap auto-prepared drafts per scan to bound time/cost within the function limit.
const MAX_AUTO_DRAFTS = 5;

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

  // Pass B — triage + synthesis over non-sensitive threads only. The learned
  // profile sharpens prioritization toward how this user actually works.
  const todayIso = new Date().toISOString().slice(0, 10);
  const triage = await triageThreads(safeThreads, todayIso, user.assistantProfile);

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

  // Refresh calendar candidates: drop stale suggestions, keep added/dismissed,
  // and add newly-suggested events (skip ones already added or dismissed).
  await prisma.calendarCandidate.deleteMany({
    where: { userId, status: "suggested" },
  });
  const handled = await prisma.calendarCandidate.findMany({
    where: { userId, status: { in: ["added", "dismissed"] } },
    select: { title: true },
  });
  const handledTitles = new Set(handled.map((c) => c.title.toLowerCase()));
  for (const c of triage.calendarItems) {
    if (handledTitles.has(c.title.toLowerCase())) continue;
    await prisma.calendarCandidate.create({
      data: {
        userId,
        title: c.title,
        start: c.start && !Number.isNaN(Date.parse(c.start)) ? new Date(c.start) : null,
        end: c.end && !Number.isNaN(Date.parse(c.end)) ? new Date(c.end) : null,
        date: c.date && !Number.isNaN(Date.parse(c.date)) ? new Date(c.date) : null,
        location: c.location ?? null,
        timeTbd: Boolean(c.timeTbd),
        threadId: c.threadId ?? null,
        status: "suggested",
      },
    });
  }

  // Autopilot — auto-prepare reply drafts (saved to Gmail Drafts, never sent).
  // Calendar adds stay one-tap by product rule; the cron never writes calendar.
  let draftsPrepared = 0;
  if (user.autopilotLevel !== "suggest") {
    const repliable = triage.actionItems.filter(
      (a) => a.needsReply && a.threadId
    );
    for (const a of repliable) {
      if (draftsPrepared >= MAX_AUTO_DRAFTS) break;
      if (!a.threadId) continue;
      try {
        const item = await prisma.actionItem.findUnique({
          where: { userId_threadId: { userId, threadId: a.threadId } },
        });
        if (!item || item.sensitive || item.draftId) continue;
        const target = await getReplyTarget(gmail, a.threadId);
        const body = await generateDraft({
          conversation: target.conversation,
          voiceSample: user.voiceSample,
          signature: user.signature,
          assistantProfile: user.assistantProfile,
        });
        const draftId = await createDraft(gmail, {
          threadId: a.threadId,
          to: target.to,
          subject: target.subject,
          inReplyTo: target.inReplyTo,
          references: target.references,
          body,
        });
        await prisma.actionItem.update({
          where: { id: item.id },
          data: { draftId },
        });
        draftsPrepared++;
      } catch {
        // one failed auto-draft never sinks the scan
      }
    }
  }

  // Reflection — learn habits from how the user has been triaging (titles +
  // action only; sensitive items excluded). Failures are non-fatal.
  try {
    const recent = await prisma.actionItem.findMany({
      where: {
        userId,
        sensitive: false,
        status: { in: ["done", "dismissed", "auto_resolved"] },
      },
      orderBy: { resolvedAt: "desc" },
      take: 25,
      select: { title: true, status: true },
    });
    if (recent.length > 0) {
      const actionWord: Record<string, string> = {
        done: "completed",
        dismissed: "dismissed",
        auto_resolved: "replied and resolved",
      };
      const updated = await reflectProfile({
        currentProfile: user.assistantProfile,
        actions: recent.map((r) => ({
          title: r.title,
          action: actionWord[r.status] ?? r.status,
        })),
      });
      if (updated && updated !== user.assistantProfile) {
        await prisma.user.update({
          where: { id: userId },
          data: { assistantProfile: updated },
        });
      }
    }
  } catch {
    // learning is best-effort
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
        draftsPrepared,
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

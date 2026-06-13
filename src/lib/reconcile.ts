import type { AiActionItem } from "@/lib/ai-schemas";

/** Extract a bare email address from a "Name <email>" header value. */
export function parseEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  return (match ? match[1] : headerValue).trim().toLowerCase();
}

/** True when the user's own address is the latest sender on the thread. */
export function isUserLatestSender(
  lastSender: string,
  userEmail: string
): boolean {
  if (!lastSender) return false;
  return parseEmail(lastSender) === userEmail.trim().toLowerCase();
}

/** A reconciled item ready to upsert into ActionItem (by userId+threadId). */
export interface ReconciledItem {
  threadId: string;
  title: string;
  summary: string | null;
  waitingOn: string | null;
  deadline: Date | null;
  priority: number;
  sensitive: boolean;
  recommendedStep: string | null;
  replyToMessageId: string | null;
}

/**
 * Map an AI action item to a DB record. Sensitive threads are stored
 * title-only — summary/waitingOn/recommendedStep are dropped, never persisted
 * (non-negotiable product rule #3/#4).
 */
export function toReconciledItem(
  ai: AiActionItem,
  sensitive: boolean
): ReconciledItem {
  const deadline =
    ai.deadline && !Number.isNaN(Date.parse(ai.deadline))
      ? new Date(ai.deadline)
      : null;
  return {
    threadId: ai.threadId,
    title: ai.title,
    summary: sensitive ? null : ai.summary ?? null,
    waitingOn: sensitive ? null : ai.waitingOn ?? null,
    deadline,
    priority: ai.priority ?? 2,
    sensitive,
    recommendedStep: sensitive ? null : ai.recommendedStep ?? null,
    replyToMessageId: sensitive ? null : ai.replyToMessageId ?? null,
  };
}

export interface ReconcileInput {
  /** Action items from the AI triage pass (non-sensitive threads). */
  aiActionItems: AiActionItem[];
  /** ThreadIds flagged sensitive in Pass A — produce title-only items. */
  sensitiveThreads: { threadId: string; title: string }[];
  /** ThreadIds of open ActionItems already in the DB. */
  openThreadIds: string[];
  /** Latest sender per thread (header value). */
  lastSenderByThread: Record<string, string>;
  userEmail: string;
}

export interface ReconcileOutput {
  /** Items to upsert (create or update) by (userId, threadId). */
  upserts: ReconciledItem[];
  /** Open thread IDs whose latest sender is the user → auto_resolved. */
  autoResolvedThreadIds: string[];
}

/**
 * Pure reconcile step (CLAUDE.md scan pipeline §5):
 *  - dedupe AI items by threadId (last write wins)
 *  - produce title-only items for sensitive threads
 *  - auto-resolve existing open items whose thread now shows the user replied
 */
export function reconcile(input: ReconcileInput): ReconcileOutput {
  const byThread = new Map<string, ReconciledItem>();

  for (const ai of input.aiActionItems) {
    if (!ai.threadId) continue;
    byThread.set(ai.threadId, toReconciledItem(ai, false));
  }

  // Sensitive threads override into title-only records (never with a summary).
  for (const s of input.sensitiveThreads) {
    byThread.set(s.threadId, {
      threadId: s.threadId,
      title: s.title,
      summary: null,
      waitingOn: null,
      deadline: null,
      priority: 2,
      sensitive: true,
      recommendedStep: null,
      replyToMessageId: null,
    });
  }

  const autoResolvedThreadIds = input.openThreadIds.filter((threadId) => {
    const lastSender = input.lastSenderByThread[threadId];
    return lastSender
      ? isUserLatestSender(lastSender, input.userEmail)
      : false;
  });

  // An item we auto-resolve shouldn't also be re-upserted as open.
  const resolvedSet = new Set(autoResolvedThreadIds);
  const upserts = [...byThread.values()].filter(
    (i) => !resolvedSet.has(i.threadId)
  );

  return { upserts, autoResolvedThreadIds };
}

import { describe, expect, it } from "vitest";
import {
  isUserLatestSender,
  parseEmail,
  reconcile,
  toReconciledItem,
} from "./reconcile";
import type { AiActionItem } from "./ai-schemas";

const aiItem = (over: Partial<AiActionItem> = {}): AiActionItem => ({
  threadId: "t1",
  replyToMessageId: "m1",
  title: "Reply to Bishop Young",
  summary: "He asked for the agenda",
  waitingOn: "you",
  deadline: "2026-06-20",
  priority: 1,
  recommendedStep: "Send the agenda",
  needsReply: true,
  ...over,
});

describe("parseEmail / isUserLatestSender", () => {
  it("extracts the address from a display-name header", () => {
    expect(parseEmail("Dave Blake <daveblake1@gmail.com>")).toBe(
      "daveblake1@gmail.com"
    );
    expect(parseEmail("plain@example.com")).toBe("plain@example.com");
  });

  it("matches the user as latest sender case-insensitively", () => {
    expect(
      isUserLatestSender("Dave <Dave@Example.com>", "dave@example.com")
    ).toBe(true);
    expect(isUserLatestSender("someone@else.com", "dave@example.com")).toBe(
      false
    );
    expect(isUserLatestSender("", "dave@example.com")).toBe(false);
  });
});

describe("toReconciledItem", () => {
  it("maps a normal item and parses the deadline", () => {
    const r = toReconciledItem(aiItem(), false);
    expect(r.summary).toBe("He asked for the agenda");
    expect(r.deadline).toEqual(new Date("2026-06-20"));
    expect(r.sensitive).toBe(false);
  });

  it("nulls every content field when sensitive (no leakage)", () => {
    const r = toReconciledItem(aiItem(), true);
    expect(r.sensitive).toBe(true);
    expect(r.summary).toBeNull();
    expect(r.waitingOn).toBeNull();
    expect(r.recommendedStep).toBeNull();
    expect(r.replyToMessageId).toBeNull();
  });

  it("tolerates a missing/invalid deadline", () => {
    expect(toReconciledItem(aiItem({ deadline: null }), false).deadline).toBeNull();
    expect(
      toReconciledItem(aiItem({ deadline: "not-a-date" }), false).deadline
    ).toBeNull();
  });
});

describe("reconcile", () => {
  it("dedupes AI items by threadId (last write wins)", () => {
    const { upserts } = reconcile({
      aiActionItems: [
        aiItem({ threadId: "t1", title: "First" }),
        aiItem({ threadId: "t1", title: "Second" }),
      ],
      sensitiveThreads: [],
      openThreadIds: [],
      lastSenderByThread: {},
      userEmail: "dave@example.com",
    });
    expect(upserts).toHaveLength(1);
    expect(upserts[0].title).toBe("Second");
  });

  it("stores sensitive threads title-only and excludes their content", () => {
    const { upserts } = reconcile({
      aiActionItems: [],
      sensitiveThreads: [{ threadId: "s1", title: "🔒 Confidential matter" }],
      openThreadIds: [],
      lastSenderByThread: {},
      userEmail: "dave@example.com",
    });
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      threadId: "s1",
      title: "🔒 Confidential matter",
      summary: null,
      sensitive: true,
    });
  });

  it("a sensitive flag overrides an AI item for the same thread", () => {
    const { upserts } = reconcile({
      aiActionItems: [aiItem({ threadId: "t1", summary: "LEAKED CONTENT" })],
      sensitiveThreads: [{ threadId: "t1", title: "🔒 Confidential matter" }],
      openThreadIds: [],
      lastSenderByThread: {},
      userEmail: "dave@example.com",
    });
    expect(upserts).toHaveLength(1);
    expect(upserts[0].sensitive).toBe(true);
    expect(upserts[0].summary).toBeNull();
    expect(JSON.stringify(upserts)).not.toContain("LEAKED CONTENT");
  });

  it("auto-resolves open threads where the user is the latest sender", () => {
    const { autoResolvedThreadIds, upserts } = reconcile({
      aiActionItems: [],
      sensitiveThreads: [],
      openThreadIds: ["t1", "t2"],
      lastSenderByThread: {
        t1: "Dave <dave@example.com>",
        t2: "Someone <someone@else.com>",
      },
      userEmail: "dave@example.com",
    });
    expect(autoResolvedThreadIds).toEqual(["t1"]);
    expect(upserts).toHaveLength(0);
  });

  it("does not re-upsert an item that was auto-resolved", () => {
    const { upserts, autoResolvedThreadIds } = reconcile({
      aiActionItems: [aiItem({ threadId: "t1" })],
      sensitiveThreads: [],
      openThreadIds: ["t1"],
      lastSenderByThread: { t1: "dave@example.com" },
      userEmail: "dave@example.com",
    });
    expect(autoResolvedThreadIds).toEqual(["t1"]);
    expect(upserts).toHaveLength(0);
  });
});

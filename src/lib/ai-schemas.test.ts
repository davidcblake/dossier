import { describe, expect, it } from "vitest";
import {
  sensitivitySchema,
  triageResultSchema,
  actionItemSchema,
} from "./ai-schemas";

describe("sensitivitySchema", () => {
  it("accepts a valid classification", () => {
    expect(
      sensitivitySchema.parse({ sensitive: true, category: "health" })
    ).toEqual({ sensitive: true, category: "health" });
  });

  it("defaults category to none", () => {
    expect(sensitivitySchema.parse({ sensitive: false }).category).toBe("none");
  });

  it("rejects an unknown category", () => {
    expect(() =>
      sensitivitySchema.parse({ sensitive: true, category: "gossip" })
    ).toThrow();
  });
});

describe("triageResultSchema", () => {
  it("fills empty arrays when keys are missing", () => {
    expect(triageResultSchema.parse({})).toEqual({
      actionItems: [],
      calendarItems: [],
      fyi: [],
    });
  });

  it("validates a full triage payload", () => {
    const parsed = triageResultSchema.parse({
      actionItems: [
        { threadId: "t1", title: "Reply", priority: 1, needsReply: true },
      ],
      calendarItems: [{ title: "Meeting", date: "2026-06-20", timeTbd: true }],
      fyi: [{ title: "Newsletter" }],
    });
    expect(parsed.actionItems[0].priority).toBe(1);
    expect(parsed.fyi[0].summary).toBe("");
  });

  it("rejects an out-of-range priority", () => {
    expect(() =>
      actionItemSchema.parse({ threadId: "t1", title: "x", priority: 9 })
    ).toThrow();
  });

  it("requires a non-empty title", () => {
    expect(() => actionItemSchema.parse({ threadId: "t1", title: "" })).toThrow();
  });
});

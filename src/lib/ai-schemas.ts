import { z } from "zod";

/**
 * Zod schemas for the strict-JSON contracts with Claude (PRD §7.2).
 * Every AI response is validated against these; on parse failure we retry once.
 */

// Pass A — sensitivity classification (Haiku), per thread.
export const sensitivitySchema = z.object({
  sensitive: z.boolean(),
  category: z
    .enum([
      "hr",
      "health",
      "financial_hardship",
      "legal",
      "ecclesiastical",
      "confidential",
      "none",
    ])
    .default("none"),
});
export type Sensitivity = z.infer<typeof sensitivitySchema>;

// Pass B — triage + synthesis (Sonnet), one prompt over all non-sensitive threads.
export const actionItemSchema = z.object({
  threadId: z.string(),
  replyToMessageId: z.string().nullable().optional(),
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  waitingOn: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(), // ISO date or null
  priority: z.number().int().min(1).max(3).default(2),
  recommendedStep: z.string().nullable().optional(),
  needsReply: z.boolean().default(false),
});
export type AiActionItem = z.infer<typeof actionItemSchema>;

export const calendarItemSchema = z.object({
  threadId: z.string().nullable().optional(),
  title: z.string().min(1),
  date: z.string().nullable().optional(), // ISO date
  start: z.string().nullable().optional(), // ISO datetime
  end: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  timeTbd: z.boolean().default(false),
});
export type AiCalendarItem = z.infer<typeof calendarItemSchema>;

export const fyiSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
});
export type AiFyi = z.infer<typeof fyiSchema>;

export const triageResultSchema = z.object({
  actionItems: z.array(actionItemSchema).default([]),
  calendarItems: z.array(calendarItemSchema).default([]),
  fyi: z.array(fyiSchema).default([]),
});
export type TriageResult = z.infer<typeof triageResultSchema>;

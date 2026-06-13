import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  sensitivitySchema,
  triageResultSchema,
  type Sensitivity,
  type TriageResult,
} from "@/lib/ai-schemas";
import type { CompactThread } from "@/lib/gmail";

// Model tiers per CLAUDE.md: Haiku for classification + triage, Sonnet for synthesis.
const HAIKU = "claude-haiku-4-5";
const SONNET = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic();
  }
  return client;
}

/** Pull the first JSON object/array out of a model response. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  return JSON.parse(raw.slice(start));
}

async function callJson<S extends z.ZodTypeAny>(
  model: string,
  system: string,
  user: string,
  schema: S,
  maxTokens: number
): Promise<z.infer<S>> {
  const run = async (): Promise<z.infer<S>> => {
    const res = await anthropic().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return schema.parse(extractJson(text));
  };
  try {
    return await run();
  } catch {
    // Retry once on parse/validation failure, per CLAUDE.md.
    return await run();
  }
}

/**
 * Pass A — sensitivity classification (Haiku). Runs FIRST; flagged threads
 * never reach Pass B. We send only a minimal snippet (participants + subject +
 * a short body excerpt) so as little sensitive content as possible is exposed.
 */
export async function classifySensitivity(
  thread: CompactThread
): Promise<Sensitivity> {
  const system =
    "You are a strict privacy classifier for an inbox assistant. " +
    "Flag a thread as sensitive if it concerns any of: personnel/HR, health, " +
    "financial hardship, legal matters, ecclesiastical/pastoral/confessional " +
    "matters, or anything explicitly marked confidential. When unsure, flag it. " +
    'Respond ONLY with JSON: {"sensitive": boolean, "category": one of ' +
    '"hr"|"health"|"financial_hardship"|"legal"|"ecclesiastical"|"confidential"|"none"}.';
  const user = [
    `Subject: ${thread.subject}`,
    `Participants: ${thread.participants.join(", ")}`,
    `Excerpt: ${thread.snippet.slice(0, 400)}`,
  ].join("\n");
  return callJson(HAIKU, system, user, sensitivitySchema, 256);
}

/**
 * Pass B — triage + synthesis (Sonnet). All non-sensitive threads in one prompt.
 * Returns strict JSON of actionItems / calendarItems / fyi (PRD §7.2).
 */
export async function triageThreads(
  threads: CompactThread[],
  todayIso: string
): Promise<TriageResult> {
  if (threads.length === 0) {
    return { actionItems: [], calendarItems: [], fyi: [] };
  }
  const system =
    "You are an inbox chief of staff. Given email threads, identify what the " +
    "user must act on. Today is " +
    todayIso +
    ". Return STRICT JSON with keys actionItems, calendarItems, fyi.\n" +
    "- actionItems[]: {threadId, replyToMessageId, title, summary, waitingOn, " +
    "deadline (ISO date or null), priority (1=urgent,2=normal,3=low), " +
    "recommendedStep, needsReply}.\n" +
    "- calendarItems[]: {threadId, title, date, start, end, location, timeTbd}.\n" +
    "- fyi[]: {title, summary} for things worth knowing but needing no action.\n" +
    "Only include an action item when the user genuinely owes a response or task. " +
    "Always echo the exact threadId and last messageId you were given. " +
    "Do not invent deadlines — use null when none is stated. Output JSON only.";
  const user = JSON.stringify(
    threads.map((t) => ({
      threadId: t.threadId,
      lastMessageId: t.lastMessageId,
      subject: t.subject,
      participants: t.participants,
      lastSender: t.lastSender,
      body: t.body.slice(0, 1500),
    }))
  );
  return callJson(SONNET, system, user, triageResultSchema, 4096);
}

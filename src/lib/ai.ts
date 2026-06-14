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
  todayIso: string,
  assistantProfile?: string | null
): Promise<TriageResult> {
  if (threads.length === 0) {
    return { actionItems: [], calendarItems: [], fyi: [] };
  }
  const profileBlock = assistantProfile?.trim()
    ? "\n\nWHAT YOU KNOW ABOUT THIS USER (use it to prioritize and phrase like " +
      "they would):\n" +
      assistantProfile.trim() +
      "\n"
    : "";
  const system =
    "You are an inbox chief of staff. Given email threads, identify what the " +
    "user must act on. Today is " +
    todayIso +
    ". Return STRICT JSON with keys actionItems, calendarItems, fyi.\n" +
    "- actionItems[]: {threadId, replyToMessageId, title, summary, waitingOn, " +
    "deadline (ISO date or null), priority (1|2|3), recommendedStep, needsReply}.\n" +
    "  • title: a short, specific headline (e.g. \"Just Serve Meeting — June 14 (this Sunday)\").\n" +
    "  • summary: 2–3 plain-sentence narrative that makes it instantly actionable — " +
    "name WHO is waiting, WHAT they need, the relevant DATE, and WHY it matters or " +
    "what's still pending. Write it the way a sharp chief of staff would brief the " +
    "user. Do not restate the title. Use Markdown **bold** to emphasize the key " +
    "dates, times, names, phone numbers, and the single most important phrase " +
    "(e.g. what is blocked or overdue). Bold sparingly — a few words per sentence " +
    "at most, never whole sentences.\n" +
    "  • recommendedStep: one short imperative next step; you may **bold** a key " +
    "name, date, or number in it.\n" +
    "- calendarItems[]: {threadId, title, date (YYYY-MM-DD), start (ISO datetime), " +
    "end (ISO datetime), location, timeTbd}.\n" +
    "- fyi[]: {title, summary} for things worth knowing but needing no action.\n\n" +
    "PRESCRIPTIVE PRIORITY — judge each action item by its content, dates, who is " +
    "waiting, and consequences, and set priority deliberately:\n" +
    "  1 = urgent: a stated deadline within ~48h or already overdue; a person is " +
    "blocked waiting on the user; time-sensitive commitments (RSVP, scheduling, " +
    "approvals); anything with clear cost to delay.\n" +
    "  2 = normal: a real response or task is owed but there is no imminent " +
    "deadline.\n" +
    "  3 = low: minor, easily deferred, or nice-to-do.\n" +
    "Rank urgency on the actual stakes, not just whether a date exists. Reflect " +
    "the deadline you infer in the `deadline` field (ISO date) when one is stated.\n\n" +
    "CALENDAR — when a thread proposes or confirms a meeting/event, extract it. If " +
    "a specific time is given, set `start` (and `end` if known) as ISO datetimes " +
    "and timeTbd=false. If only a date is known, set `date` and timeTbd=true. " +
    "Include location when stated.\n\n" +
    "Only include an action item when the user genuinely owes a response or task. " +
    "Always echo the exact threadId and last messageId you were given. " +
    "Do not invent deadlines or times — use null when none is stated. Output JSON only." +
    profileBlock;
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

/**
 * Generate a reply draft in the user's voice (Sonnet). Returns plain-text body
 * only — Dossier saves it to Gmail Drafts; the human reviews and sends.
 */
export async function generateDraft(args: {
  conversation: string;
  voiceSample?: string | null;
  signature?: string | null;
  assistantProfile?: string | null;
}): Promise<string> {
  const system =
    "You write email reply drafts for the user to review and send themselves. " +
    "Write only the reply body — no subject line, no 'Draft:' preamble, no " +
    "commentary. Match the user's voice from the sample if provided. Be warm, " +
    "concise, and specific to the thread. Do not invent facts or commitments. " +
    (args.signature
      ? `End with this signature exactly: "${args.signature}".`
      : "Do not add a signature.");
  const user = [
    args.assistantProfile?.trim()
      ? `What you know about the user:\n${args.assistantProfile.trim()}\n`
      : "",
    args.voiceSample ? `Voice sample (mimic this style):\n${args.voiceSample}\n` : "",
    `Thread to reply to:\n${args.conversation}`,
  ].join("\n");

  const res = await anthropic().messages.create({
    model: SONNET,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/**
 * Reflection pass (Haiku): update the learned profile from what the user did
 * with their action items. Operates on titles + the action taken only — never
 * raw email bodies or sensitive content — so it learns habits, not secrets.
 */
export async function reflectProfile(args: {
  currentProfile: string | null;
  actions: { title: string; action: string }[];
}): Promise<string> {
  const current = args.currentProfile?.trim() ?? "";
  if (args.actions.length === 0) return current;

  const system =
    "You maintain a short profile of how a user manages their inbox, so an " +
    "assistant can prioritize and write like them. Given the current profile " +
    "and the user's recent actions on items (completed / snoozed / dismissed / " +
    "deleted), output an UPDATED profile: concise bullet points capturing " +
    "durable preferences — what they treat as urgent, recurring people or " +
    "topics they care about, what they routinely ignore or defer, and tone. " +
    "Merge with the existing profile; drop anything contradicted. Keep it under " +
    "180 words. Do not include one-off specifics or anything sensitive. Output " +
    "the profile text only, no preamble.";
  const user =
    `Current profile:\n${current || "(none yet)"}\n\nRecent actions:\n` +
    args.actions.map((a) => `- ${a.action}: ${a.title}`).join("\n");

  const res = await anthropic().messages.create({
    model: HAIKU,
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return text || current;
}

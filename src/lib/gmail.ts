import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { authForUser } from "@/lib/google-auth";

export { NeedsReconnectError } from "@/lib/google-auth";

/** A privacy-trimmed representation of a thread for the AI passes. */
export interface CompactThread {
  threadId: string;
  lastMessageId: string;
  subject: string;
  participants: string[];
  lastSender: string;
  snippet: string;
  body: string;
}

/** Authenticated Gmail client for a user (refreshes the access token). */
export async function gmailForUser(userId: string): Promise<gmail_v1.Gmail> {
  return google.gmail({ version: "v1", auth: await authForUser(userId) });
}

function header(
  msg: gmail_v1.Schema$Message | undefined,
  name: string
): string {
  const h = msg?.payload?.headers?.find(
    (x) => x.name?.toLowerCase() === name.toLowerCase()
  );
  return h?.value ?? "";
}

/** Recursively pull the text/plain body, falling back to the snippet. */
function extractBody(msg: gmail_v1.Schema$Message | undefined): string {
  const decode = (data?: string | null) =>
    data ? Buffer.from(data, "base64").toString("utf8") : "";

  const walk = (part?: gmail_v1.Schema$MessagePart): string => {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decode(part.body.data);
    }
    for (const p of part.parts ?? []) {
      const found = walk(p);
      if (found) return found;
    }
    return "";
  };

  const body = walk(msg?.payload) || decode(msg?.payload?.body?.data);
  return stripQuoted(body) || msg?.snippet || "";
}

/** Strip quoted reply history so we only send the latest message content. */
export function stripQuoted(body: string): string {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*On .+ wrote:\s*$/.test(line)) break;
    if (/^\s*-----Original Message-----/.test(line)) break;
    if (/^\s*>/.test(line)) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

/** List inbox thread IDs from the last 7 days, plus any extra IDs supplied. */
export async function listThreadIds(
  gmail: gmail_v1.Gmail,
  extraThreadIds: string[] = [],
  max = 40
): Promise<string[]> {
  const res = await gmail.users.threads.list({
    userId: "me",
    q: "in:inbox newer_than:7d",
    maxResults: max,
  });
  const ids = (res.data.threads ?? [])
    .map((t) => t.id)
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set([...ids, ...extraThreadIds]));
}

export interface ReplyTarget {
  to: string;
  subject: string;
  inReplyTo: string;
  references: string;
  conversation: string;
}

/**
 * Gather everything needed to draft a threaded reply: recipient, Re: subject,
 * In-Reply-To / References headers, and the trimmed conversation text for the
 * AI prompt. Reads only — used by the draft route (never sends).
 */
export async function getReplyTarget(
  gmail: gmail_v1.Gmail,
  threadId: string
): Promise<ReplyTarget> {
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });
  const messages = res.data.messages ?? [];
  const last = messages[messages.length - 1];

  const replyTo = header(last, "Reply-To");
  const to = replyTo || header(last, "From");
  const rawSubject = header(messages[0], "Subject") || "(no subject)";
  const subject = /^re:/i.test(rawSubject) ? rawSubject : `Re: ${rawSubject}`;
  const lastMessageId = header(last, "Message-ID") || header(last, "Message-Id");
  const priorRefs = header(last, "References");
  const references = [priorRefs, lastMessageId].filter(Boolean).join(" ");

  const conversation = messages
    .slice(-3)
    .map((m) => `From: ${header(m, "From")}\n${extractBody(m)}`)
    .join("\n\n---\n\n")
    .slice(0, 4000);

  return { to, subject, inReplyTo: lastMessageId, references, conversation };
}

function encodeWord(value: string): string {
  // RFC 2047 encode a non-ASCII header word (e.g. a name with accents).
  return /[^\x20-\x7e]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;
}

/** Encode only the display-name part of an address; keep <addr> raw. */
function encodeAddress(value: string): string {
  const m = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) {
    const name = m[1];
    return name ? `${encodeWord(name)} <${m[2]}>` : `<${m[2]}>`;
  }
  return value; // bare address — leave as-is
}

export interface CreateDraftArgs {
  threadId: string;
  to: string;
  subject: string;
  inReplyTo: string;
  references: string;
  body: string;
}

/**
 * Create a threaded reply draft in Gmail Drafts. Uses gmail.compose only —
 * there is deliberately no send path anywhere in this codebase.
 * Returns the created draft id.
 */
export async function createDraft(
  gmail: gmail_v1.Gmail,
  args: CreateDraftArgs
): Promise<string> {
  const lines = [
    `To: ${encodeAddress(args.to)}`,
    `Subject: ${encodeWord(args.subject)}`,
  ];
  if (args.inReplyTo) {
    lines.push(`In-Reply-To: ${args.inReplyTo}`);
    if (args.references) lines.push(`References: ${args.references}`);
  }
  lines.push('Content-Type: text/plain; charset="UTF-8"', "", args.body);

  const raw = Buffer.from(lines.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { threadId: args.threadId, raw } },
  });
  const id = res.data.id;
  if (!id) throw new Error("Gmail did not return a draft id");
  return id;
}

/** Fetch one thread and build its compact, quote-stripped representation. */
export async function getCompactThread(
  gmail: gmail_v1.Gmail,
  threadId: string
): Promise<CompactThread> {
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });
  const messages = res.data.messages ?? [];
  const last = messages[messages.length - 1];

  const participants = new Set<string>();
  for (const m of messages) {
    const from = header(m, "From");
    if (from) participants.add(from);
  }

  return {
    threadId,
    lastMessageId: last?.id ?? "",
    subject: header(messages[0], "Subject") || "(no subject)",
    participants: Array.from(participants).slice(0, 8),
    lastSender: header(last, "From"),
    snippet: last?.snippet ?? "",
    body: extractBody(last).slice(0, 1500),
  };
}

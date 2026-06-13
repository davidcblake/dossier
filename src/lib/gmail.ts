import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";

/**
 * Thrown when Google rejects the refresh token (Testing-mode 7-day expiry).
 * Callers mark the user `needs_reconnect` and skip them.
 */
export class NeedsReconnectError extends Error {
  constructor() {
    super("Google refresh token is invalid (needs_reconnect)");
    this.name = "NeedsReconnectError";
  }
}

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

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Produce an authenticated Gmail client for a user, refreshing the access token
 * from the stored (encrypted) refresh token. On invalid_grant, marks the user
 * needs_reconnect and throws NeedsReconnectError.
 */
export async function gmailForUser(userId: string): Promise<gmail_v1.Gmail> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) throw new NeedsReconnectError();

  const auth = oauthClient();
  auth.setCredentials({ refresh_token: decryptToken(account.refreshToken) });

  try {
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
    if (credentials.access_token) {
      await prisma.googleAccount.update({
        where: { userId },
        data: {
          accessToken: encryptToken(credentials.access_token),
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        },
      });
    }
  } catch (err: unknown) {
    const msg = String((err as { message?: string })?.message ?? err);
    if (/invalid_grant/i.test(msg)) {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "needs_reconnect" },
      });
      throw new NeedsReconnectError();
    }
    throw err;
  }

  return google.gmail({ version: "v1", auth });
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

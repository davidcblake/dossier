import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.PUSH_CONTACT ?? "support@dossier.app"}`,
    pub,
    priv
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Send a web-push to a user. Reads their stored subscription; if Google/Apple
 * reports it gone (404/410), clears it so we stop trying. Returns true if sent.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  if (!configure()) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSub: true },
  });
  const sub = user?.pushSub as webpush.PushSubscription | null;
  if (!sub) return false;

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const code = (err as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) {
      await prisma.user.update({
        where: { id: userId },
        data: { pushSub: undefined },
      });
    }
    return false;
  }
}

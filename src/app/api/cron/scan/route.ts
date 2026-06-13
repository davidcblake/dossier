import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanUser } from "@/lib/scan";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Current hour (0–23) in a timezone. */
function localHour(timezone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "America/Denver",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date())
  );
}

/**
 * Hourly Vercel Cron. Fans out to every active user whose local time matches
 * their digestHour, scans them, and sends the daily push. Protected by
 * CRON_SECRET (Vercel sends it as a Bearer token).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authed =
    Boolean(secret) &&
    request.headers.get("authorization") === `Bearer ${secret}`;
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: { id: true, timezone: true, digestHour: true },
  });

  let scanned = 0;
  for (const user of users) {
    if (localHour(user.timezone) !== user.digestHour) continue;
    try {
      const result = await scanUser(user.id);
      scanned++;
      if (result.status === "ok") {
        const n = result.actionItems;
        await sendPushToUser(user.id, {
          title: "Dossier",
          body:
            n > 0
              ? `${n} thing${n === 1 ? "" : "s"} waiting on you`
              : "Your inbox is clear for today",
          url: `${process.env.APP_URL ?? ""}/today`,
        });
      }
    } catch (err) {
      console.error(`[dossier][cron] user ${user.id} failed:`, err);
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), scanned });
}

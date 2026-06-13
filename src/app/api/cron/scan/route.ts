import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanUser } from "@/lib/scan";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily Vercel Cron (Hobby plan allows once-per-day). Scans every active user
 * and sends the daily push. Protected by CRON_SECRET (Vercel sends it as a
 * Bearer token).
 *
 * On Vercel Pro you can switch vercel.json to an hourly schedule ("0 * * * *")
 * and re-enable per-user `digestHour` fan-out by skipping users whose local
 * hour doesn't match.
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
    select: { id: true },
  });

  let scanned = 0;
  for (const user of users) {
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

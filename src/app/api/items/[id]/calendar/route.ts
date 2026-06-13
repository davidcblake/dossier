import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addEvent } from "@/lib/calendar";
import { NeedsReconnectError } from "@/lib/google-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-tap calendar add for an action item. Uses the user's chosen calendar
 * (defaults to primary). No deadline / no time → all-day placeholder today;
 * a deadline with no time → all-day on that date.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const calendarId = user?.calendarId ?? "primary";
  const date = item.deadline
    ? item.deadline.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  try {
    const eventId = await addEvent(session.user.id, {
      calendarId,
      title: item.title,
      date,
      timeTbd: true, // action items carry a date, not a time → all-day
    });
    await prisma.actionItem.update({ where: { id }, data: { eventId } });
    return NextResponse.json({ eventId });
  } catch (err) {
    if (err instanceof NeedsReconnectError) {
      return NextResponse.json({ error: "needs_reconnect" }, { status: 409 });
    }
    console.error("[dossier][calendar] failed:", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 500 });
  }
}

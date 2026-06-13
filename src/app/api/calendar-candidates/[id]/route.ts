import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addEvent, deleteEvent } from "@/lib/calendar";
import { NeedsReconnectError } from "@/lib/google-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ action: z.enum(["add", "dismiss", "remove"]) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const candidate = await prisma.calendarCandidate.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!candidate) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const calendarId = user?.calendarId ?? "primary";

  try {
    if (parsed.data.action === "add") {
      const eventId = await addEvent(session.user.id, {
        calendarId,
        title: candidate.title,
        start: candidate.start ? candidate.start.toISOString() : null,
        end: candidate.end ? candidate.end.toISOString() : null,
        date: candidate.date ? candidate.date.toISOString().slice(0, 10) : null,
        location: candidate.location,
        timeTbd: candidate.timeTbd,
      });
      await prisma.calendarCandidate.update({
        where: { id },
        data: { status: "added", eventId },
      });
      return NextResponse.json({ status: "added", eventId });
    }

    if (parsed.data.action === "remove") {
      if (candidate.eventId) {
        await deleteEvent(session.user.id, calendarId, candidate.eventId);
      }
      await prisma.calendarCandidate.update({
        where: { id },
        data: { status: "dismissed", eventId: null },
      });
      return NextResponse.json({ status: "removed" });
    }

    // dismiss
    await prisma.calendarCandidate.update({
      where: { id },
      data: { status: "dismissed" },
    });
    return NextResponse.json({ status: "dismissed" });
  } catch (err) {
    if (err instanceof NeedsReconnectError) {
      return NextResponse.json({ error: "needs_reconnect" }, { status: 409 });
    }
    console.error("[dossier][calendar-candidate] failed:", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 500 });
  }
}

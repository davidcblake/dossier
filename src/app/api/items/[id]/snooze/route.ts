import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SNOOZE_DAYS = 2;

/** Snooze an item: keep it open but hide it from the list for 2 days. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const until = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.actionItem.updateMany({
    where: { id, userId: session.user.id },
    data: { status: "open", snoozedUntil: until },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ snoozedUntil: until.toISOString() });
}

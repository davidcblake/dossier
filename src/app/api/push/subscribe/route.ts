import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Save the browser's push subscription for the signed-in user. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sub = await req.json().catch(() => null);
  if (!sub || typeof sub.endpoint !== "string") {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { pushSub: sub as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}

/** Remove the push subscription (turn notifications off). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { pushSub: undefined },
  });
  return NextResponse.json({ ok: true });
}

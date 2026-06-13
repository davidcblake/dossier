import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  status: z.enum(["done", "dismissed", "open"]),
});

/** Check off / dismiss / reopen an action item. */
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
  const { status } = parsed.data;

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.actionItem.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "open" ? null : new Date(),
    },
  });
  return NextResponse.json({ status });
}

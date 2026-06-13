import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  deadline: z.string().nullable().optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  waitingOn: z.string().trim().max(300).nullable().optional(),
});

/** Create a manual action item (no thread). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { title, deadline, priority, waitingOn } = parsed.data;

  const item = await prisma.actionItem.create({
    data: {
      userId: session.user.id,
      title,
      priority: priority ?? 2,
      waitingOn: waitingOn ?? null,
      deadline:
        deadline && !Number.isNaN(Date.parse(deadline))
          ? new Date(deadline)
          : null,
    },
  });
  return NextResponse.json({ id: item.id });
}

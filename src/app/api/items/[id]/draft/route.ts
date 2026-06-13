import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gmailForUser, getReplyTarget, createDraft, NeedsReconnectError } from "@/lib/gmail";
import { generateDraft } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  // Product rule: never draft for sensitive threads — handle personally.
  if (item.sensitive) {
    return NextResponse.json({ error: "sensitive" }, { status: 403 });
  }
  if (!item.threadId) {
    return NextResponse.json({ error: "no_thread" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  try {
    const gmail = await gmailForUser(session.user.id);
    const target = await getReplyTarget(gmail, item.threadId);
    const body = await generateDraft({
      conversation: target.conversation,
      voiceSample: user?.voiceSample,
      signature: user?.signature,
    });
    const draftId = await createDraft(gmail, {
      threadId: item.threadId,
      to: target.to,
      subject: target.subject,
      inReplyTo: target.inReplyTo,
      references: target.references,
      body,
    });
    await prisma.actionItem.update({ where: { id }, data: { draftId } });
    return NextResponse.json({ draftId });
  } catch (err) {
    if (err instanceof NeedsReconnectError) {
      return NextResponse.json({ error: "needs_reconnect" }, { status: 409 });
    }
    console.error("[dossier][draft] failed:", err);
    return NextResponse.json({ error: "draft_failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * Hard-delete the account: revoke the Google token, then delete the user row
 * (cascades to GoogleAccount, ActionItems, Digests, CalendarCandidates).
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const account = await prisma.googleAccount.findUnique({
    where: { userId: session.user.id },
  });
  if (account?.refreshToken) {
    try {
      const token = decryptToken(account.refreshToken);
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(token)}`,
      });
    } catch {
      // best-effort revoke; still delete the account below
    }
  }

  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ deleted: true });
}

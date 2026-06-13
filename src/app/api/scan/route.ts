import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scanUser } from "@/lib/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manual "Scan now" — scans the signed-in user's inbox (Phase 2). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await scanUser(session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[dossier][scan] failed:", err);
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }
}

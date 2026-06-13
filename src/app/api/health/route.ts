import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint for deploy/setup verification. Reports the *presence*
 * and *format* of configuration and basic DB connectivity — never the values
 * of any secret.
 *
 * Access is gated: callers must either have a signed-in session, or present
 * `Authorization: Bearer <CRON_SECRET>`. Unauthorized callers get a 404 so the
 * endpoint doesn't advertise itself.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  const hasBearer =
    Boolean(cronSecret) && bearer === `Bearer ${cronSecret}`;

  if (!hasBearer) {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const required = [
    "DATABASE_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "AUTH_SECRET",
    "TOKEN_ENC_KEY",
    "APP_URL",
    "ANTHROPIC_API_KEY",
  ];

  const envPresent: Record<string, boolean> = {};
  for (const key of required) envPresent[key] = Boolean(process.env[key]);

  // TOKEN_ENC_KEY must be exactly 64 hex chars (AES-256 key). This is the most
  // common misconfiguration (e.g. pasting a base64 value instead of hex).
  const tokenKeyValidFormat = /^[0-9a-fA-F]{64}$/.test(
    process.env.TOKEN_ENC_KEY ?? ""
  );

  let database: { ok: boolean; code?: string; tablesReady?: boolean } = {
    ok: false,
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    // confirm the schema was actually applied
    await prisma.user.count();
    database = { ok: true, tablesReady: true };
  } catch (err: unknown) {
    // Report only an error code/name, not the full message (which can include
    // the database host).
    const code =
      (err as { code?: string })?.code ??
      (err as { name?: string })?.name ??
      "unknown";
    const tablesReady = !/does not exist|relation/i.test(
      (err as Error)?.message ?? ""
    );
    database = { ok: false, code, tablesReady };
  }

  // ANTHROPIC_API_KEY is not required until Phase 2's scan pipeline runs, so it
  // doesn't gate overall readiness here.
  const phase1Keys = required.filter((k) => k !== "ANTHROPIC_API_KEY");
  const ok =
    phase1Keys.every((k) => envPresent[k]) &&
    tokenKeyValidFormat &&
    database.ok;

  return NextResponse.json(
    { ok, envPresent, tokenKeyValidFormat, database },
    { status: ok ? 200 : 503 }
  );
}

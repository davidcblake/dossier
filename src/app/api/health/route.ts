import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint for deploy/setup verification. Reports the *presence*
 * and *format* of configuration and basic DB connectivity — never the values
 * of any secret. Safe to remove once setup is stable.
 */
export async function GET() {
  const required = [
    "DATABASE_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "AUTH_SECRET",
    "TOKEN_ENC_KEY",
    "APP_URL",
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

  const ok =
    Object.values(envPresent).every(Boolean) &&
    tokenKeyValidFormat &&
    database.ok;

  return NextResponse.json(
    { ok, envPresent, tokenKeyValidFormat, database },
    { status: ok ? 200 : 503 }
  );
}

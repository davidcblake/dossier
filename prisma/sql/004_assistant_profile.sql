-- Learning + autopilot. Run once in the Supabase SQL Editor. Idempotent.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "assistantProfile" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "autopilotLevel" TEXT NOT NULL DEFAULT 'prepare';

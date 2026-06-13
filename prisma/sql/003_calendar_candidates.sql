-- Phase 4 UX migration. Run once in the Supabase SQL Editor.
-- Idempotent: safe to re-run.

-- Snooze support on action items.
ALTER TABLE "ActionItem" ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMP(3);

-- How the user likes to be greeted (name or title).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "greetingName" TEXT;

-- Calendar candidates as their own rows, so "Add to calendar" can show an
-- added/confirmed state and be removed.
CREATE TABLE IF NOT EXISTS "CalendarCandidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "date" TIMESTAMP(3),
    "location" TEXT,
    "timeTbd" BOOLEAN NOT NULL DEFAULT false,
    "threadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarCandidate_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CalendarCandidate_userId_fkey'
  ) THEN
    ALTER TABLE "CalendarCandidate"
      ADD CONSTRAINT "CalendarCandidate_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

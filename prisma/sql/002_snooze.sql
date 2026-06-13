-- Phase 4 UX: snooze support. Run once in the Supabase SQL Editor.
ALTER TABLE "ActionItem" ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMP(3);

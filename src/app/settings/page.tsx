import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listCalendars, type CalendarChoice } from "@/lib/calendar";

export const dynamic = "force-dynamic";

async function saveSettings(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const digestHourRaw = Number(formData.get("digestHour"));
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      calendarId: (formData.get("calendarId") as string) || null,
      signature: (formData.get("signature") as string) || null,
      voiceSample: (formData.get("voiceSample") as string) || null,
      digestHour:
        Number.isInteger(digestHourRaw) && digestHourRaw >= 0 && digestHourRaw <= 23
          ? digestHourRaw
          : 7,
    },
  });
  redirect("/settings?saved=1");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const { saved } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/");

  let calendars: CalendarChoice[] = [];
  let calendarError = false;
  try {
    calendars = await listCalendars(session.user.id);
  } catch {
    calendarError = true;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="font-(family-name:--font-display) text-4xl font-semibold">
          Settings
        </h1>
        <Link
          href="/today"
          className="text-sm text-(--color-ink-soft) underline underline-offset-4"
        >
          Back to Today
        </Link>
      </header>

      {saved && (
        <p className="mt-4 rounded-lg bg-(--color-gold-soft) px-3 py-2 text-sm">
          ✓ Saved.
        </p>
      )}

      <form action={saveSettings} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium">Target calendar</label>
          {calendarError ? (
            <>
              <p className="mt-1 text-xs text-(--color-gold)">
                Couldn’t load your calendars (you may need to reconnect Google).
                Enter a calendar ID manually if you know it.
              </p>
              <input
                name="calendarId"
                defaultValue={user.calendarId ?? "primary"}
                className="mt-2 w-full rounded-lg border border-(--color-gold-soft) bg-white/60 px-3 py-2 text-sm"
              />
            </>
          ) : (
            <select
              name="calendarId"
              defaultValue={user.calendarId ?? ""}
              className="mt-2 w-full rounded-lg border border-(--color-gold-soft) bg-white/60 px-3 py-2 text-sm"
            >
              <option value="">Primary (default)</option>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.summary}
                  {c.primary ? " (primary)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Digest hour (0–23)</label>
          <input
            name="digestHour"
            type="number"
            min={0}
            max={23}
            defaultValue={user.digestHour}
            className="mt-2 w-24 rounded-lg border border-(--color-gold-soft) bg-white/60 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-(--color-ink-soft)">
            When your daily scan runs (your timezone: {user.timezone}).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Signature (for drafts)
          </label>
          <input
            name="signature"
            defaultValue={user.signature ?? ""}
            placeholder="e.g. President Blake"
            className="mt-2 w-full rounded-lg border border-(--color-gold-soft) bg-white/60 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Voice sample</label>
          <p className="mt-1 text-xs text-(--color-ink-soft)">
            Paste 2–3 sent emails so drafts sound like you.
          </p>
          <textarea
            name="voiceSample"
            rows={6}
            defaultValue={user.voiceSample ?? ""}
            className="mt-2 w-full rounded-lg border border-(--color-gold-soft) bg-white/60 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-(--color-ink) px-6 py-3 text-sm font-medium text-(--color-paper) shadow-sm transition hover:opacity-90"
        >
          Save settings
        </button>
      </form>
    </main>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ScanButton } from "./scan-button";
import { BottomNav } from "@/components/bottom-nav";
import { ReconnectBanner } from "@/components/reconnect-banner";
import { ActionCard, type ActionCardItem } from "@/components/action-card";
import {
  CalendarCandidateCard,
  type CandidateView,
} from "@/components/calendar-candidate-card";
import {
  priorityLabel,
  ageLabel,
  deadlineLabel,
  calendarWhenLabel,
  greeting,
} from "@/lib/item-view";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { googleAccount: true },
  });
  if (!user) redirect("/");

  const connected = Boolean(user.googleAccount?.refreshToken);

  const items = await prisma.actionItem.findMany({
    where: {
      userId: user.id,
      status: "open",
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }],
    },
    orderBy: [
      { priority: "asc" },
      { deadline: { sort: "asc", nulls: "last" } },
      { firstSeen: "asc" },
    ],
  });

  const latestDigest = await prisma.digest.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
  const fyi = (latestDigest?.fyi as FyiEntry[] | null) ?? [];

  const candidates = await prisma.calendarCandidate.findMany({
    where: { userId: user.id, status: { in: ["suggested", "added"] } },
    orderBy: [{ start: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  const calendarCards: CandidateView[] = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    whenLabel: calendarWhenLabel({
      start: c.start,
      date: c.date,
      timeTbd: c.timeTbd,
      timezone: user.timezone,
    }),
    location: c.location,
    status: c.status === "added" ? "added" : "suggested",
  }));

  const cards: ActionCardItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    sensitive: item.sensitive,
    threadId: item.threadId,
    priorityLabel: priorityLabel(item.priority),
    ageLabel: ageLabel(item.firstSeen),
    deadlineLabel: deadlineLabel(item.deadline),
    waitingOn: item.waitingOn,
    recommendedStep: item.recommendedStep,
    hasDraft: Boolean(item.draftId),
    hasEvent: Boolean(item.eventId),
  }));

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-10">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-(family-name:--font-display) text-4xl font-semibold">
              {greeting({
                timezone: user.timezone,
                greetingName: user.greetingName,
                name: user.name,
              })}
            </h1>
          </div>
          {connected && <ScanButton />}
        </header>

        {user.status === "needs_reconnect" ? (
          <ReconnectBanner />
        ) : (
          !connected && (
            <section className="mt-6 rounded-2xl border border-(--color-gold-soft) bg-white/60 p-5 text-sm">
              ⚠️ Google not fully connected — open Settings and reconnect.
            </section>
          )
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
            Waiting on you
          </h2>
          {cards.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-(--color-gold-soft) p-5 text-sm text-(--color-ink-soft)">
              Nothing waiting on you right now. Tap “Scan now” to check your inbox.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {cards.map((item) => (
                <ActionCard key={item.id} item={item} showThreadActions />
              ))}
            </ul>
          )}
        </section>

        {calendarCards.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              Calendar
            </h2>
            <ul className="mt-3 space-y-3">
              {calendarCards.map((c) => (
                <CalendarCandidateCard key={c.id} item={c} />
              ))}
            </ul>
          </section>
        )}

        {fyi.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              FYI
            </h2>
            <ul className="mt-3 space-y-2">
              {fyi.map((f, i) => (
                <li key={i} className="text-sm text-(--color-ink-soft)">
                  <span className="font-medium text-(--color-ink)">
                    {f.title}
                  </span>
                  {f.summary ? ` — ${f.summary}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  );
}

interface FyiEntry {
  title: string;
  summary?: string;
}

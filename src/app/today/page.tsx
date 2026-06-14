import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ScanButton } from "./scan-button";
import { BottomNav } from "@/components/bottom-nav";
import { ReconnectBanner } from "@/components/reconnect-banner";
import { BriefItem, type BriefItemData } from "@/components/brief-item";
import {
  CalendarCandidateCard,
  type CandidateView,
} from "@/components/calendar-candidate-card";
import {
  ChecklistIcon,
  CalendarIcon,
  MailIcon,
  InfoIcon,
} from "@/components/icons";
import {
  deadlineLabel,
  calendarWhenLabel,
  greeting,
  focusLine,
} from "@/lib/item-view";
import { Emphasis } from "@/lib/emphasis";

export const dynamic = "force-dynamic";

function gmailLink(threadId: string | null) {
  return threadId
    ? `https://mail.google.com/mail/u/0/#inbox/${threadId}`
    : undefined;
}

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { googleAccount: true },
  });
  if (!user) redirect("/");

  const connected = Boolean(user.googleAccount?.refreshToken);
  const now = new Date();

  const items = await prisma.actionItem.findMany({
    where: {
      userId: user.id,
      status: "open",
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
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

  const actionItems: BriefItemData[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    sensitive: item.sensitive,
    threadId: item.threadId,
    deadlineLabel: deadlineLabel(item.deadline),
    urgent: item.priority === 1,
    waitingOn: item.waitingOn,
    recommendedStep: item.recommendedStep,
    hasDraft: Boolean(item.draftId),
    hasEvent: Boolean(item.eventId),
    isManual: item.threadId === null,
  }));

  // Drafts recap — open items that already have a Gmail draft waiting to send.
  const drafts = items.filter((i) => i.draftId && !i.sensitive);

  const urgentCount = actionItems.filter((a) => a.urgent).length;

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-(family-name:--font-serif) text-3xl font-semibold leading-tight">
              {greeting({
                timezone: user.timezone,
                greetingName: user.greetingName,
                name: user.name,
              })}
            </h1>
            <p className="mt-1 font-(family-name:--font-serif) text-[17px] leading-snug text-(--color-ink-soft)">
              {focusLine({ count: actionItems.length, urgent: urgentCount })}
            </p>
          </div>
          {connected && <ScanButton />}
        </header>

        {user.status === "needs_reconnect" ? (
          <ReconnectBanner />
        ) : (
          !connected && (
            <section className="mt-6 rounded-2xl border border-(--color-gold-soft) bg-white/50 p-5 text-sm">
              ⚠️ Google not fully connected — open Settings and reconnect.
            </section>
          )
        )}

        <Section icon={<ChecklistIcon size={20} />} title="Action items">
          {actionItems.length === 0 ? (
            <p className="font-(family-name:--font-serif) text-[16px] leading-relaxed text-(--color-ink-soft)">
              Nothing waiting on you right now. Tap “Scan now” to check your
              inbox.
            </p>
          ) : (
            <ul className="space-y-5 font-(family-name:--font-serif)">
              {actionItems.map((item) => (
                <BriefItem key={item.id} item={item} />
              ))}
            </ul>
          )}
        </Section>

        {calendarCards.length > 0 && (
          <Section icon={<CalendarIcon size={20} />} title="Added to your calendar">
            <ul className="space-y-3">
              {calendarCards.map((c) => (
                <CalendarCandidateCard key={c.id} item={c} />
              ))}
            </ul>
          </Section>
        )}

        {drafts.length > 0 && (
          <Section
            icon={<MailIcon size={20} />}
            title="Drafts in your Gmail — review & send yourself"
          >
            <ul className="list-disc space-y-2 pl-5 font-(family-name:--font-serif) text-[16px] leading-relaxed text-(--color-ink) marker:text-(--color-ink-soft)">
              {drafts.map((d) => (
                <li key={d.id}>
                  <span className="font-semibold">{d.title}</span>
                  {gmailLink(d.threadId) && (
                    <>
                      {" — "}
                      <a
                        href={gmailLink(d.threadId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-(--color-gold) underline underline-offset-2"
                      >
                        review in Gmail
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {fyi.length > 0 && (
          <Section icon={<InfoIcon size={20} />} title="FYI — no action">
            <ul className="list-disc space-y-2 pl-5 font-(family-name:--font-serif) text-[16px] leading-relaxed text-(--color-ink) marker:text-(--color-ink-soft)">
              {fyi.map((f, i) => (
                <li key={i}>
                  <span className="font-semibold">{f.title}</span>
                  {f.summary ? (
                    <>
                      {" — "}
                      <span className="text-(--color-ink-soft)">
                        <Emphasis text={f.summary} />
                      </span>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>
      <BottomNav />
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-9">
      <h2 className="flex items-center gap-2 border-b border-(--color-gold-soft) pb-2 font-(family-name:--font-serif) text-xl font-semibold text-(--color-ink)">
        <span className="text-(--color-ink-soft)">{icon}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface FyiEntry {
  title: string;
  summary?: string;
}

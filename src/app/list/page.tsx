import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ListActions } from "./list-actions";
import { AddItem } from "./add-item";
import { BottomNav } from "@/components/bottom-nav";
import { ActionCard, type ActionCardItem } from "@/components/action-card";
import { priorityLabel, ageLabel, deadlineLabel } from "@/lib/item-view";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const now = new Date();

  const open = await prisma.actionItem.findMany({
    where: {
      userId: session.user.id,
      status: "open",
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    orderBy: [
      { priority: "asc" },
      { deadline: { sort: "asc", nulls: "last" } },
      { firstSeen: "asc" },
    ],
  });

  const snoozedCount = await prisma.actionItem.count({
    where: { userId: session.user.id, status: "open", snoozedUntil: { gt: now } },
  });

  const resolved = await prisma.actionItem.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["done", "auto_resolved", "dismissed"] },
    },
    orderBy: { resolvedAt: "desc" },
    take: 50,
  });

  const cards: ActionCardItem[] = open.map((item) => ({
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
        <h1 className="font-(family-name:--font-display) text-4xl font-semibold">
          List
        </h1>

        <div className="mt-6">
          <AddItem />
        </div>

        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              Open · {open.length}
            </h2>
            {snoozedCount > 0 && (
              <span className="text-xs text-(--color-ink-soft)">
                {snoozedCount} snoozed
              </span>
            )}
          </div>
          {cards.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-(--color-gold-soft) p-5 text-sm text-(--color-ink-soft)">
              Your list is clear. 🎉
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {cards.map((item) => (
                <ActionCard
                  key={item.id}
                  item={item}
                  showThreadActions={false}
                />
              ))}
            </ul>
          )}
        </section>

        {resolved.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              Done · {resolved.length}
            </summary>
            <ul className="mt-3 space-y-2">
              {resolved.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-(--color-gold-soft) bg-white/40 px-4 py-3"
                >
                  <span className="text-sm text-(--color-ink-soft) line-through">
                    {item.sensitive && <span aria-hidden>🔒 </span>}
                    {item.title}
                    {item.status === "auto_resolved" && (
                      <span className="ml-2 text-xs">(you replied)</span>
                    )}
                    {item.status === "dismissed" && (
                      <span className="ml-2 text-xs">(dismissed)</span>
                    )}
                  </span>
                  <ListActions id={item.id} open={false} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>
      <BottomNav />
    </>
  );
}

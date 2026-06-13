import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ScanButton } from "./scan-button";

export const dynamic = "force-dynamic";

function gmailLink(threadId: string | null) {
  return threadId
    ? `https://mail.google.com/mail/u/0/#inbox/${threadId}`
    : undefined;
}

function deadlineLabel(deadline: Date | null): string | null {
  if (!deadline) return null;
  const days = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return `overdue ${Math.abs(days)}d`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
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

  const items = await prisma.actionItem.findMany({
    where: { userId: user.id, status: "open" },
    orderBy: [{ priority: "asc" }, { deadline: "asc" }, { firstSeen: "asc" }],
  });

  const latestDigest = await prisma.digest.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
  const calendar = (latestDigest?.calendar as CalendarCandidate[] | null) ?? [];
  const fyi = (latestDigest?.fyi as FyiEntry[] | null) ?? [];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-(family-name:--font-display) text-4xl font-semibold">
            Today
          </h1>
          <p className="mt-1 text-(--color-ink-soft)">
            Good morning{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-(--color-ink-soft) underline underline-offset-4"
            >
              Sign out
            </button>
          </form>
          {connected && <ScanButton />}
        </div>
      </header>

      {!connected && (
        <section className="mt-6 rounded-2xl border border-(--color-gold-soft) bg-white/60 p-5 text-sm">
          ⚠️ Google not fully connected — please sign in again and grant access.
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
          Waiting on you
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-(--color-gold-soft) p-5 text-sm text-(--color-ink-soft)">
            Nothing waiting on you right now. Tap “Scan now” to check your inbox.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((item) => {
              const link = gmailLink(item.threadId);
              const due = deadlineLabel(item.deadline);
              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-(--color-gold-soft) bg-white/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">
                      {item.sensitive && <span aria-hidden>🔒 </span>}
                      {item.title}
                    </h3>
                    {due && (
                      <span className="shrink-0 rounded-full bg-(--color-gold-soft) px-2 py-0.5 text-xs text-(--color-ink)">
                        {due}
                      </span>
                    )}
                  </div>
                  {item.summary && (
                    <p className="mt-1 text-sm text-(--color-ink-soft)">
                      {item.summary}
                    </p>
                  )}
                  {item.waitingOn && (
                    <p className="mt-1 text-xs text-(--color-ink-soft)">
                      Waiting on: {item.waitingOn}
                    </p>
                  )}
                  {item.recommendedStep && (
                    <p className="mt-1 text-xs text-(--color-ink-soft)">
                      Next: {item.recommendedStep}
                    </p>
                  )}
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-(--color-gold) underline underline-offset-2"
                    >
                      Open in Gmail →
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {calendar.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
            Calendar candidates
          </h2>
          <ul className="mt-3 space-y-2">
            {calendar.map((c, i) => (
              <li
                key={i}
                className="rounded-2xl border border-(--color-gold-soft) bg-white/60 p-4 text-sm"
              >
                <span className="font-medium">{c.title}</span>
                {(c.date || c.start) && (
                  <span className="text-(--color-ink-soft)">
                    {" — "}
                    {c.timeTbd ? `${c.date ?? ""} (time TBD)` : c.start ?? c.date}
                  </span>
                )}
              </li>
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
                <span className="font-medium text-(--color-ink)">{f.title}</span>
                {f.summary ? ` — ${f.summary}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

interface CalendarCandidate {
  title: string;
  date?: string | null;
  start?: string | null;
  timeTbd?: boolean;
}
interface FyiEntry {
  title: string;
  summary?: string;
}

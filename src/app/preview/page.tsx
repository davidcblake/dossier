import Link from "next/link";

export const metadata = { title: "Design preview — Dossier" };

/**
 * Public, data-free design playground for the main digest screen.
 * Three directions with the user's sample content. Not linked in the app.
 */

// shared sample content
const NEEDS = [
  {
    title: "Just Serve Meeting — June 14 (this Sunday)",
    urgent: true,
    when: "in 3 days",
    body: (
      <>
        <b>President Cody Gillen</b> asked you to attend the Just Serve meeting on{" "}
        <b>June 14</b> in his place while he&apos;s away — <Hi>you never replied</Hi>.
        It&apos;s at the Stake Building Relief Society room, conducted by Jordan
        Hardy, planning the 9/11 service project.
      </>
    ),
  },
  {
    title: "Annual Audit Training — July 12 logistics open",
    urgent: false,
    when: "Jul 12",
    body: (
      <>
        The group agreed on <b>July 12</b> for audit training with Steve Ruf. You,
        Nick Huntsman, and Paul Tew all confirmed — but <Hi>no one locked the time
        or sent the invite</Hi>. As stake president, that finalize-and-send likely
        falls to you.
      </>
    ),
  },
  {
    title: "PG Seminary Council — Brother Fugal follow-up",
    urgent: false,
    when: null,
    body: (
      <>
        President Gillen forwarded a Seminary Council email about following up with{" "}
        <b>Brother Fugal</b>. You replied <i>&quot;I&apos;ll respond&quot;</i> — but
        there&apos;s <Hi>no evidence you actually did</Hi>. Still pending.
      </>
    ),
  },
];

const FYI = [
  { lead: "Church communication", rest: "— changes to the Sunday class schedule. Worth reading, no reply." },
  { lead: "Ministering Munch & Mingle", rest: "(8th Ward, June 14, Spring Meadows Park 9–11am)." },
  { lead: "Zone Conference invite", rest: "— already forwarded, handled." },
];

function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-(--color-gold)/12 px-1 font-medium text-(--color-ink)">
      {children}
    </span>
  );
}

function SectionLabel({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-(--color-ink)">
      <span aria-hidden>{dot}</span>
      {children}
    </h2>
  );
}

/* ───────────────────────── Option A — Editorial ───────────────────────── */
function OptionA() {
  return (
    <div className="space-y-5">
      <SectionLabel dot="🔴">Needs your response</SectionLabel>
      <ol className="space-y-5">
        {NEEDS.map((n, i) => (
          <li key={i}>
            <h3 className="font-medium leading-snug">
              {i + 1}. {n.title}
              {n.when && (
                <span
                  className={`ml-1 text-xs ${n.urgent ? "text-(--color-gold)" : "text-(--color-ink-soft)"}`}
                >
                  · {n.when}
                </span>
              )}
            </h3>
            <p className="mt-1 text-[15px] leading-relaxed text-(--color-ink-soft)">
              {n.body}
            </p>
          </li>
        ))}
      </ol>
      <hr className="border-(--color-gold-soft)" />
      <SectionLabel dot="📋">FYI / no response needed</SectionLabel>
      <ul className="list-disc space-y-2 pl-5 text-[15px] text-(--color-ink-soft)">
        {FYI.map((f, i) => (
          <li key={i}>
            <b className="text-(--color-ink)">{f.lead}</b> {f.rest}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── Option B — Priority cards ──────────────────── */
function OptionB() {
  return (
    <div className="space-y-5">
      <SectionLabel dot="🔴">Needs your response</SectionLabel>
      <div className="space-y-3">
        {NEEDS.map((n, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-white/60 p-4"
            style={{
              borderColor: n.urgent ? "var(--color-gold)" : "var(--color-gold-soft)",
              borderLeftWidth: n.urgent ? 4 : 1,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium leading-snug">{n.title}</h3>
              {n.when && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    n.urgent
                      ? "bg-(--color-gold) text-white"
                      : "bg-(--color-gold-soft) text-(--color-ink)"
                  }`}
                >
                  {n.when}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-(--color-ink-soft)">
              {n.body}
            </p>
          </div>
        ))}
      </div>
      <SectionLabel dot="📋">FYI / no response needed</SectionLabel>
      <div className="rounded-2xl border border-(--color-gold-soft) bg-white/40 p-4">
        <ul className="space-y-2 text-[15px] text-(--color-ink-soft)">
          {FYI.map((f, i) => (
            <li key={i}>
              <b className="text-(--color-ink)">{f.lead}</b> {f.rest}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────────────────── Option C — Compact feed ────────────────────── */
function OptionC() {
  return (
    <div>
      <SectionLabel dot="🔴">Needs your response</SectionLabel>
      <ul className="mt-3 divide-y divide-(--color-gold-soft)">
        {NEEDS.map((n, i) => (
          <li key={i} className="flex gap-3 py-3.5">
            <span
              className="mt-2 size-2 shrink-0 rounded-full"
              style={{
                background: n.urgent ? "var(--color-gold)" : "var(--color-gold-soft)",
              }}
            />
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate font-medium">{n.title}</h3>
                {n.when && (
                  <span
                    className={`shrink-0 text-xs ${n.urgent ? "text-(--color-gold)" : "text-(--color-ink-soft)"}`}
                  >
                    {n.when}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-(--color-ink-soft)">
                {n.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <SectionLabel dot="📋">FYI</SectionLabel>
        <ul className="mt-2 space-y-1.5 text-sm text-(--color-ink-soft)">
          {FYI.map((f, i) => (
            <li key={i}>
              <b className="text-(--color-ink)">{f.lead}</b> {f.rest}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t-8 border-(--color-paper-deep) pt-6">
      <p className="mb-4 inline-block rounded-full bg-(--color-ink) px-3 py-1 text-xs font-medium uppercase tracking-wider text-(--color-paper)">
        {label}
      </p>
      {children}
    </section>
  );
}

export default function PreviewPage() {
  return (
    <main className="mx-auto max-w-md space-y-8 px-5 py-8">
      <header>
        <h1 className="font-(family-name:--font-display) text-3xl font-bold lowercase">
          design preview
        </h1>
        <p className="mt-1 text-sm text-(--color-ink-soft)">
          Three directions for the daily screen. Scroll through and tell me which
          you prefer (or mix). Swipe-to-act and live data come once we pick.
        </p>
      </header>

      <Frame label="Option A · Editorial">
        <OptionA />
      </Frame>
      <Frame label="Option B · Priority cards">
        <OptionB />
      </Frame>
      <Frame label="Option C · Compact feed">
        <OptionC />
      </Frame>

      <p className="pt-6 text-center text-xs text-(--color-ink-soft)">
        <Link href="/today" className="underline underline-offset-2">
          ← back to app
        </Link>
      </p>
    </main>
  );
}

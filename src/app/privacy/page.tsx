import Link from "next/link";

export const metadata = { title: "Privacy — Dossier" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-sm text-(--color-ink-soft) underline underline-offset-4"
      >
        ← Back
      </Link>
      <h1 className="mt-4 font-(family-name:--font-display) text-4xl font-bold lowercase">
        privacy
      </h1>
      <p className="mt-2 text-sm text-(--color-ink-soft)">
        How Dossier handles your data. Plain language, no surprises.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-medium">What Dossier accesses</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            With your permission, Dossier reads your Gmail to prepare your daily
            digest and creates reply <em>drafts</em>, and reads/writes your
            Google Calendar to add events you confirm. It uses read and draft
            scopes only — it can never send email on your behalf.
          </p>
        </section>
        <section>
          <h2 className="font-medium">What we store</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-(--color-ink-soft)">
            <li>Your profile, settings, and preferences.</li>
            <li>
              Action items as metadata only (title, short summary, dates,
              thread id) — never full email bodies.
            </li>
            <li>OAuth tokens, encrypted at rest (AES-256-GCM).</li>
            <li>Digest history and receipts of drafts/events created.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-medium">What we never store</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            Raw email bodies are processed in memory during a scan and never
            persisted. Threads detected as sensitive (HR, health, finances,
            legal, ecclesiastical, or marked confidential) are flagged and{" "}
            <em>excluded</em> — their contents are never sent to draft prompts
            or stored; only a generic “Confidential matter” marker is kept.
          </p>
        </section>
        <section>
          <h2 className="font-medium">AI processing</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            Non-sensitive thread content is sent to Anthropic’s API to produce
            your digest and drafts. Sensitive threads are excluded from that
            processing.
          </p>
        </section>
        <section>
          <h2 className="font-medium">Deleting your data</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            Delete your account anytime in Settings. This permanently removes
            all your data and revokes Dossier’s Google access.
          </p>
        </section>
        <section>
          <h2 className="font-medium">Contact</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            Questions: reach out to the Dossier operator who invited you.
          </p>
        </section>
      </div>
    </main>
  );
}

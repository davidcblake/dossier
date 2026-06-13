import Link from "next/link";

export const metadata = { title: "Terms — Dossier" };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-sm text-(--color-ink-soft) underline underline-offset-4"
      >
        ← Back
      </Link>
      <h1 className="mt-4 font-(family-name:--font-display) text-4xl font-bold lowercase">
        terms
      </h1>
      <p className="mt-2 text-sm text-(--color-ink-soft)">
        Dossier is in friends &amp; family beta. By using it you agree to the
        following.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-medium">The service</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            Dossier reads your inbox to produce a daily digest, keeps a running
            action list, prepares reply drafts for your review, and adds
            calendar events you confirm. It never sends email and never deletes
            or archives your mail.
          </p>
        </section>
        <section>
          <h2 className="font-medium">Beta software</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            This is pre-release software provided “as is,” without warranties.
            It may have bugs or downtime. AI-generated summaries, priorities,
            and drafts can be wrong — review everything before acting. You are
            responsible for what you send and for events you add.
          </p>
        </section>
        <section>
          <h2 className="font-medium">Google access</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            While in Google’s Testing mode, access tokens expire about every 7
            days and you’ll be asked to reconnect. You can revoke access anytime
            from your Google account or by deleting your Dossier account.
          </p>
        </section>
        <section>
          <h2 className="font-medium">Acceptable use</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            Use Dossier only with an account you control. Don’t attempt to
            misuse, overload, or reverse-engineer the service.
          </p>
        </section>
        <section>
          <h2 className="font-medium">Liability</h2>
          <p className="mt-1 text-(--color-ink-soft)">
            To the extent permitted by law, the operator isn’t liable for any
            damages arising from use of this beta.
          </p>
        </section>
      </div>
    </main>
  );
}

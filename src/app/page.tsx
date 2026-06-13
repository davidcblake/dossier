import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/today");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Image
        src="/icons/dossier-icon.svg"
        alt=""
        width={72}
        height={72}
        className="rounded-2xl border border-(--color-gold-soft)"
        priority
      />
      <h1 className="mt-5 font-(family-name:--font-display) text-6xl font-bold lowercase tracking-tight">
        dossier
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-(--color-ink-soft)">
        Know what’s waiting on you. A daily scan of your inbox, a running
        action list, one-tap calendar adds, and reply drafts that wait for
        your approval.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-(--color-ink-soft)">
        <li>✓ Dossier never sends email — it only prepares drafts</li>
        <li>✓ Confidential threads are flagged, never summarized</li>
        <li>✓ Nothing is ever deleted or archived</li>
      </ul>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/today" });
        }}
        className="mt-10"
      >
        <button
          type="submit"
          className="w-full rounded-xl bg-(--color-ink) px-6 py-4 text-base font-medium text-(--color-paper) shadow-sm transition hover:opacity-90"
        >
          Continue with Google
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-(--color-ink-soft)">
        Read &amp; drafts access only. You always press send yourself.
      </p>
      <p className="mt-6 text-center text-xs text-(--color-ink-soft)">
        <a href="/privacy" className="underline underline-offset-2">
          Privacy
        </a>{" "}
        ·{" "}
        <a href="/terms" className="underline underline-offset-2">
          Terms
        </a>
      </p>
    </main>
  );
}

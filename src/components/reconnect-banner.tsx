import { signIn } from "@/auth";

/**
 * Shown when a user's Google token has expired (Testing-mode 7-day expiry).
 * One tap re-runs the OAuth flow; a fresh refresh token clears needs_reconnect.
 */
export function ReconnectBanner() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/today" });
      }}
      className="mt-6"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-(--color-gold) bg-(--color-gold)/10 p-4">
        <p className="text-sm">
          <span className="font-medium">Reconnect Google</span> — your weekly
          access expired, so scans are paused until you reconnect.
        </p>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-(--color-gold) px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Reconnect
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function DeleteAccount() {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function del() {
    setBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut({ callbackUrl: "/" });
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-(--color-gold) underline underline-offset-4"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-(--color-ink)">
        Permanently delete your account and all data, and revoke Google access?
        This can’t be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={del}
          className="min-h-9 rounded-lg bg-(--color-gold) px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="min-h-9 rounded-lg px-4 py-2 text-sm text-(--color-ink-soft)"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

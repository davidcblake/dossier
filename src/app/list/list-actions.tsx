"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ListActions({
  id,
  open,
}: {
  id: string;
  open: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(status: "done" | "dismissed" | "open") {
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => set("open")}
        className="rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) disabled:opacity-50"
      >
        Reopen
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => set("done")}
        className="rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) disabled:opacity-50"
      >
        ✓ Done
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => set("dismissed")}
        className="rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium text-(--color-ink-soft) transition hover:bg-(--color-gold-soft) disabled:opacity-50"
      >
        Dismiss
      </button>
    </div>
  );
}

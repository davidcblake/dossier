"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CandidateView {
  id: string;
  title: string;
  whenLabel: string | null;
  location: string | null;
  status: "suggested" | "added";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CalendarCandidateCard({ item }: { item: CandidateView }) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function act(action: "add" | "dismiss" | "remove") {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/calendar-candidates/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");

      if (action === "add") {
        setStatus("added");
        setBusy(false);
      } else {
        setGone(true);
        await sleep(320);
        router.refresh();
      }
    } catch (e) {
      setBusy(false);
      setNote(
        (e as Error).message === "needs_reconnect"
          ? "Reconnect Google to add events."
          : "Couldn’t update calendar."
      );
    }
  }

  return (
    <li
      className="grid transition-all duration-300 ease-out"
      style={{ gridTemplateRows: gone ? "0fr" : "1fr", opacity: gone ? 0 : 1 }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="rounded-2xl border border-(--color-gold-soft) bg-white/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium leading-snug">{item.title}</p>
              {item.whenLabel && (
                <p className="mt-0.5 text-sm text-(--color-ink-soft)">
                  {item.whenLabel}
                </p>
              )}
              {item.location && (
                <p className="text-xs text-(--color-ink-soft)">
                  📍 {item.location}
                </p>
              )}
            </div>
            {status === "suggested" ? (
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => act("dismiss")}
                disabled={busy}
                className="shrink-0 rounded-full px-2 text-(--color-ink-soft) transition hover:text-(--color-ink) disabled:opacity-50"
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-3">
            {status === "suggested" ? (
              <button
                type="button"
                onClick={() => act("add")}
                disabled={busy}
                className="min-h-9 rounded-lg bg-(--color-ink) px-4 py-1.5 text-xs font-medium text-(--color-paper) transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add to calendar"}
              </button>
            ) : (
              <>
                <span className="text-xs font-medium text-(--color-gold)">
                  ✓ Added to your calendar
                </span>
                <button
                  type="button"
                  onClick={() => act("remove")}
                  disabled={busy}
                  className="text-xs text-(--color-ink-soft) underline underline-offset-2 transition hover:text-(--color-ink) disabled:opacity-50"
                >
                  {busy ? "Removing…" : "Remove"}
                </button>
              </>
            )}
          </div>
          {note && <p className="mt-2 text-xs text-(--color-gold)">{note}</p>}
        </div>
      </div>
    </li>
  );
}

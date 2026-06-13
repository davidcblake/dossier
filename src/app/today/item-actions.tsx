"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  sensitive: boolean;
  hasDraft: boolean;
  hasEvent: boolean;
}

export function ItemActions({ id, sensitive, hasDraft, hasEvent }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "draft" | "calendar" | "done">(null);
  const [note, setNote] = useState<string | null>(null);
  const [draftDone, setDraftDone] = useState(hasDraft);
  const [eventDone, setEventDone] = useState(hasEvent);

  async function post(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "failed");
    return data;
  }

  async function draft() {
    setBusy("draft");
    setNote(null);
    try {
      await post(`/api/items/${id}/draft`);
      setDraftDone(true);
      setNote("Draft saved to Gmail.");
    } catch (e) {
      setNote(
        (e as Error).message === "needs_reconnect"
          ? "Reconnect Google to draft."
          : "Couldn’t create draft."
      );
    } finally {
      setBusy(null);
    }
  }

  async function calendar() {
    setBusy("calendar");
    setNote(null);
    try {
      await post(`/api/items/${id}/calendar`);
      setEventDone(true);
      setNote("Added to your calendar.");
    } catch (e) {
      setNote(
        (e as Error).message === "needs_reconnect"
          ? "Reconnect Google to add events."
          : "Couldn’t add to calendar."
      );
    } finally {
      setBusy(null);
    }
  }

  async function markDone() {
    setBusy("done");
    try {
      await post(`/api/items/${id}/status`, { status: "done" });
      router.refresh();
    } catch {
      setNote("Couldn’t update.");
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={markDone}
        disabled={busy !== null}
        className="rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) disabled:opacity-50"
      >
        {busy === "done" ? "…" : "✓ Done"}
      </button>

      {!sensitive && (
        <>
          <button
            type="button"
            onClick={draft}
            disabled={busy !== null}
            className="rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) disabled:opacity-50"
          >
            {busy === "draft" ? "Drafting…" : draftDone ? "Re-draft" : "Draft reply"}
          </button>
          <button
            type="button"
            onClick={calendar}
            disabled={busy !== null || eventDone}
            className="rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) disabled:opacity-50"
          >
            {busy === "calendar" ? "Adding…" : eventDone ? "On calendar ✓" : "Add to calendar"}
          </button>
        </>
      )}

      {note && <span className="text-xs text-(--color-gold)">{note}</span>}
    </div>
  );
}

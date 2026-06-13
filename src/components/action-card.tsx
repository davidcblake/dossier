"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ActionCardItem {
  id: string;
  title: string;
  summary: string | null;
  sensitive: boolean;
  threadId: string | null;
  priorityLabel: string;
  ageLabel: string | null;
  deadlineLabel: string | null;
  waitingOn: string | null;
  recommendedStep: string | null;
  hasDraft: boolean;
  hasEvent: boolean;
}

function gmailLink(threadId: string | null) {
  return threadId
    ? `https://mail.google.com/mail/u/0/#inbox/${threadId}`
    : undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ActionCard({
  item,
  showThreadActions,
}: {
  item: ActionCardItem;
  showThreadActions: boolean;
}) {
  const router = useRouter();
  const [gone, setGone] = useState(false);
  const [working, setWorking] = useState<null | "draft" | "calendar">(null);
  const [draftDone, setDraftDone] = useState(item.hasDraft);
  const [eventDone, setEventDone] = useState(item.hasEvent);
  const [note, setNote] = useState<string | null>(null);

  async function send(path: string, method = "POST", body?: unknown) {
    const res = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "failed");
    return data;
  }

  // complete / snooze / delete all animate the card away optimistically.
  async function resolve(kind: "complete" | "snooze" | "delete") {
    setGone(true);
    try {
      if (kind === "complete") {
        await send(`/api/items/${item.id}/status`, "POST", { status: "done" });
      } else if (kind === "snooze") {
        await send(`/api/items/${item.id}/snooze`);
      } else {
        await send(`/api/items/${item.id}`, "DELETE");
      }
      await sleep(320); // let the collapse finish before re-fetching
      router.refresh();
    } catch {
      setGone(false);
      setNote("Couldn’t update — try again.");
    }
  }

  async function draft() {
    setWorking("draft");
    setNote(null);
    try {
      await send(`/api/items/${item.id}/draft`);
      setDraftDone(true);
      setNote("Draft saved to Gmail.");
    } catch (e) {
      setNote(
        (e as Error).message === "needs_reconnect"
          ? "Reconnect Google to draft."
          : "Couldn’t create draft."
      );
    } finally {
      setWorking(null);
    }
  }

  async function calendar() {
    setWorking("calendar");
    setNote(null);
    try {
      await send(`/api/items/${item.id}/calendar`);
      setEventDone(true);
      setNote("Added to your calendar.");
    } catch (e) {
      setNote(
        (e as Error).message === "needs_reconnect"
          ? "Reconnect Google to add events."
          : "Couldn’t add to calendar."
      );
    } finally {
      setWorking(null);
    }
  }

  const link = gmailLink(item.threadId);

  return (
    <li
      className="grid transition-all duration-300 ease-out"
      style={{
        gridTemplateRows: gone ? "0fr" : "1fr",
        opacity: gone ? 0 : 1,
        transform: gone ? "scale(0.97)" : "none",
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="rounded-2xl border border-(--color-gold-soft) bg-white/60 p-4">
          <div className="flex items-start gap-3">
            {/* tap-to-complete */}
            <button
              type="button"
              aria-label="Mark complete"
              onClick={() => resolve("complete")}
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-(--color-gold) text-transparent transition hover:bg-(--color-gold) hover:text-white active:scale-90"
            >
              ✓
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium leading-snug">
                  {item.sensitive && <span aria-hidden>🔒 </span>}
                  {item.title}
                </h3>
                {item.deadlineLabel && (
                  <span className="shrink-0 rounded-full bg-(--color-gold-soft) px-2 py-0.5 text-xs text-(--color-ink)">
                    {item.deadlineLabel}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-(--color-ink-soft)">
                <span>{item.priorityLabel}</span>
                {item.ageLabel && <span>· {item.ageLabel}</span>}
                {item.waitingOn && <span>· waiting on {item.waitingOn}</span>}
              </div>

              {item.summary && (
                <p className="mt-1 text-sm text-(--color-ink-soft)">
                  {item.summary}
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
            </div>
          </div>

          {/* thumb-friendly action row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Snooze 2 days"
              title="Snooze 2 days"
              onClick={() => resolve("snooze")}
              className="flex min-h-9 items-center gap-1 rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) active:scale-95"
            >
              <span aria-hidden>⏰</span> 2d
            </button>
            {showThreadActions && !item.sensitive && (
              <>
                <button
                  type="button"
                  onClick={draft}
                  disabled={working !== null}
                  className="min-h-9 rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) active:scale-95 disabled:opacity-50"
                >
                  {working === "draft" ? "Drafting…" : draftDone ? "Re-draft" : "Draft reply"}
                </button>
                <button
                  type="button"
                  onClick={calendar}
                  disabled={working !== null || eventDone}
                  className="min-h-9 rounded-lg border border-(--color-gold-soft) px-3 py-1.5 text-xs font-medium transition hover:bg-(--color-gold-soft) active:scale-95 disabled:opacity-50"
                >
                  {working === "calendar" ? "Adding…" : eventDone ? "On calendar ✓" : "Add to calendar"}
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="Delete"
              title="Delete"
              onClick={() => resolve("delete")}
              className="ml-auto flex min-h-9 items-center rounded-lg px-3 py-1.5 text-base text-(--color-ink-soft) transition hover:text-(--color-ink) active:scale-95"
            >
              <span aria-hidden>🗑️</span>
            </button>
          </div>

          {note && <p className="mt-2 text-xs text-(--color-gold)">{note}</p>}
        </div>
      </div>
    </li>
  );
}

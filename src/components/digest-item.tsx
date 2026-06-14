"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, CheckIcon, TrashIcon } from "@/components/icons";

export interface DigestItemData {
  id: string;
  title: string;
  summary: string | null;
  sensitive: boolean;
  threadId: string | null;
  deadlineLabel: string | null;
  urgent: boolean;
  waitingOn: string | null;
  recommendedStep: string | null;
  hasDraft: boolean;
  hasEvent: boolean;
}

const ACTIONS_WIDTH = 222; // 3 × 74px action buttons
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function gmailLink(threadId: string | null) {
  return threadId
    ? `https://mail.google.com/mail/u/0/#inbox/${threadId}`
    : undefined;
}

export function DigestItem({
  index,
  item,
}: {
  index: number;
  item: DigestItemData;
}) {
  const router = useRouter();
  const [offset, setOffset] = useState(0); // 0 = closed, -ACTIONS_WIDTH = open
  const [gone, setGone] = useState(false);
  const [working, setWorking] = useState<null | "draft" | "calendar">(null);
  const [draftDone, setDraftDone] = useState(item.hasDraft);
  const [eventDone, setEventDone] = useState(item.hasEvent);
  const [note, setNote] = useState<string | null>(null);

  const startX = useRef(0);
  const startOffset = useRef(0);
  const dragging = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
    dragging.current = true;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const next = Math.max(-ACTIONS_WIDTH, Math.min(0, startOffset.current + dx));
    setOffset(next);
  }
  function onTouchEnd() {
    dragging.current = false;
    setOffset(offset < -ACTIONS_WIDTH / 2 ? -ACTIONS_WIDTH : 0);
  }

  async function call(path: string, method = "POST", body?: unknown) {
    const res = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "failed");
    return data;
  }

  async function resolve(kind: "complete" | "snooze" | "delete") {
    setGone(true);
    try {
      if (kind === "complete")
        await call(`/api/items/${item.id}/status`, "POST", { status: "done" });
      else if (kind === "snooze") await call(`/api/items/${item.id}/snooze`);
      else await call(`/api/items/${item.id}`, "DELETE");
      await sleep(320);
      router.refresh();
    } catch {
      setGone(false);
      setOffset(0);
      setNote("Couldn’t update — try again.");
    }
  }

  async function draft() {
    setWorking("draft");
    setNote(null);
    try {
      await call(`/api/items/${item.id}/draft`);
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
      await call(`/api/items/${item.id}/calendar`);
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
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="relative overflow-hidden">
          {/* swipe-revealed actions */}
          <div className="absolute inset-y-0 right-0 flex">
            <button
              type="button"
              aria-label="Snooze 2 days"
              onClick={() => resolve("snooze")}
              className="flex w-[74px] flex-col items-center justify-center gap-1 bg-(--color-gold-soft) text-xs text-(--color-ink)"
            >
              <ClockIcon />
              2d
            </button>
            <button
              type="button"
              aria-label="Complete"
              onClick={() => resolve("complete")}
              className="flex w-[74px] flex-col items-center justify-center gap-1 bg-(--color-ink) text-xs text-(--color-paper)"
            >
              <CheckIcon />
              Done
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => resolve("delete")}
              className="flex w-[74px] flex-col items-center justify-center gap-1 bg-(--color-gold) text-xs text-white"
            >
              <TrashIcon />
              Delete
            </button>
          </div>

          {/* foreground content */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              transform: `translateX(${offset}px)`,
              transition: dragging.current ? "none" : "transform 0.25s ease",
              touchAction: "pan-y",
            }}
            className="bg-(--color-paper) py-4"
          >
            <h3 className="font-medium leading-snug">
              <span className="text-(--color-ink-soft)">{index}. </span>
              {item.sensitive && <span aria-hidden>🔒 </span>}
              {item.title}
              {item.deadlineLabel && (
                <span
                  className={`ml-2 align-middle text-xs ${
                    item.urgent ? "text-(--color-gold)" : "text-(--color-ink-soft)"
                  }`}
                >
                  · {item.deadlineLabel}
                </span>
              )}
            </h3>

            {item.summary && (
              <p className="mt-1 text-[15px] leading-relaxed text-(--color-ink-soft)">
                {item.summary}
              </p>
            )}
            {item.waitingOn && (
              <p className="mt-1 text-xs text-(--color-ink-soft)">
                Waiting on: {item.waitingOn}
              </p>
            )}

            {(link || (!item.sensitive && item.threadId)) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {!item.sensitive && item.threadId && (
                  <>
                    <button
                      type="button"
                      onClick={draft}
                      disabled={working !== null}
                      className="text-(--color-gold) underline underline-offset-2 disabled:opacity-50"
                    >
                      {working === "draft"
                        ? "Drafting…"
                        : draftDone
                          ? "Re-draft"
                          : "Draft reply"}
                    </button>
                    <button
                      type="button"
                      onClick={calendar}
                      disabled={working !== null || eventDone}
                      className="text-(--color-gold) underline underline-offset-2 disabled:opacity-50"
                    >
                      {working === "calendar"
                        ? "Adding…"
                        : eventDone
                          ? "On calendar ✓"
                          : "Add to calendar"}
                    </button>
                  </>
                )}
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-(--color-ink-soft) underline underline-offset-2"
                  >
                    Open in Gmail
                  </a>
                )}
              </div>
            )}
            {note && <p className="mt-1 text-xs text-(--color-gold)">{note}</p>}
          </div>
        </div>
      </div>
    </li>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, CheckIcon, DismissIcon, TrashIcon } from "@/components/icons";
import { Emphasis } from "@/lib/emphasis";

export interface BriefItemData {
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
  /** Manual items (no email thread) are the only ones that can be deleted. */
  isManual: boolean;
}

const BTN = 74; // width of one swipe-action button
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function gmailLink(threadId: string | null) {
  return threadId
    ? `https://mail.google.com/mail/u/0/#inbox/${threadId}`
    : undefined;
}

export function BriefItem({ item }: { item: BriefItemData }) {
  const router = useRouter();
  // Snooze + Dismiss always; Delete only on manual items.
  const actionsWidth = item.isManual ? BTN * 3 : BTN * 2;

  const [offset, setOffset] = useState(0); // 0 = closed, -actionsWidth = open
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
    setOffset(Math.max(-actionsWidth, Math.min(0, startOffset.current + dx)));
  }
  function onTouchEnd() {
    dragging.current = false;
    setOffset(offset < -actionsWidth / 2 ? -actionsWidth : 0);
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

  async function resolve(kind: "complete" | "snooze" | "dismiss" | "delete") {
    setGone(true);
    try {
      if (kind === "complete")
        await call(`/api/items/${item.id}/status`, "POST", { status: "done" });
      else if (kind === "dismiss")
        await call(`/api/items/${item.id}/status`, "POST", {
          status: "dismissed",
        });
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
  const showThreadActions = !item.sensitive && Boolean(item.threadId);

  return (
    <li
      className="grid transition-all duration-300 ease-out"
      style={{ gridTemplateRows: gone ? "0fr" : "1fr", opacity: gone ? 0 : 1 }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="relative overflow-hidden rounded-xl">
          {/* swipe-revealed actions */}
          <div className="absolute inset-y-0 right-0 flex">
            <button
              type="button"
              aria-label="Snooze 2 days"
              onClick={() => resolve("snooze")}
              className="flex w-[74px] flex-col items-center justify-center gap-1 bg-(--color-gold-soft) text-xs text-(--color-ink)"
            >
              <ClockIcon size={18} />
              2d
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => resolve("dismiss")}
              className="flex w-[74px] flex-col items-center justify-center gap-1 bg-(--color-ink) text-xs text-(--color-paper)"
            >
              <DismissIcon size={18} />
              Dismiss
            </button>
            {item.isManual && (
              <button
                type="button"
                aria-label="Delete"
                onClick={() => resolve("delete")}
                className="flex w-[74px] flex-col items-center justify-center gap-1 bg-(--color-gold) text-xs text-white"
              >
                <TrashIcon size={18} />
                Delete
              </button>
            )}
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
            className="flex gap-3 bg-(--color-paper) py-1"
          >
            {/* tap-to-complete */}
            <button
              type="button"
              aria-label="Mark complete"
              onClick={() => resolve("complete")}
              className="mt-1 flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-(--color-gold) text-transparent transition hover:bg-(--color-gold) hover:text-(--color-paper) active:scale-90"
            >
              <CheckIcon size={14} />
            </button>

            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold leading-snug">
                {item.urgent && (
                  <ClockIcon
                    size={16}
                    className="mr-1 inline align-[-2px] text-(--color-gold)"
                  />
                )}
                {item.sensitive && <span aria-hidden>🔒 </span>}
                {item.title}
                {item.deadlineLabel && (
                  <span
                    className={`ml-1.5 align-middle text-xs ${
                      item.urgent
                        ? "text-(--color-gold)"
                        : "text-(--color-ink-soft)"
                    }`}
                  >
                    · {item.deadlineLabel}
                  </span>
                )}
              </h3>

              {item.summary && (
                <p className="mt-1 text-[16px] leading-relaxed text-(--color-ink-soft)">
                  <Emphasis text={item.summary} />
                </p>
              )}
              {item.recommendedStep && (
                <p className="mt-1 text-[15px] italic leading-relaxed text-(--color-ink-soft)">
                  Recommended: <Emphasis text={item.recommendedStep} />
                </p>
              )}
              {item.waitingOn && (
                <p className="mt-1 text-xs text-(--color-ink-soft)">
                  Waiting on: {item.waitingOn}
                </p>
              )}

              {(showThreadActions || link) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {showThreadActions && (
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
      </div>
    </li>
  );
}

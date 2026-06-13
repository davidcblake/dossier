"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "dossier-install-hint-dismissed";

/**
 * One-time hint for iOS Safari users on how to install Dossier to the home
 * screen. Hidden once installed (standalone) or dismissed.
 */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      nav.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    const isIOS = /iphone|ipad|ipod/i.test(nav.userAgent);
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (isIOS && !standalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4">
      <div className="flex items-start gap-3 rounded-2xl border border-(--color-gold-soft) bg-white/95 p-4 text-sm shadow-lg backdrop-blur">
        <span aria-hidden className="text-lg">
          📲
        </span>
        <p className="flex-1 text-(--color-ink)">
          Install Dossier: tap{" "}
          <span className="font-medium">Share</span> then{" "}
          <span className="font-medium">Add to Home Screen</span>.
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setShow(false);
          }}
          className="text-(--color-ink-soft)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

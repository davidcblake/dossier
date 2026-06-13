"use client";

import { useEffect } from "react";

/** Registers the service worker so Dossier is installable + offline-aware. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registration failures are non-fatal
      });
    }
  }, []);
  return null;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScanButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "scanning" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function scan() {
    setState("scanning");
    setMessage(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "scan_failed");
      if (data.status === "needs_reconnect") {
        setMessage("Google needs reconnecting — please sign in again.");
        setState("error");
        return;
      }
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
      setMessage("Scan failed. Please try again.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={scan}
        disabled={state === "scanning"}
        className="rounded-lg bg-(--color-ink) px-4 py-2 text-sm font-medium text-(--color-paper) shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {state === "scanning" ? "Scanning…" : "Scan now"}
      </button>
      {message && <p className="text-xs text-(--color-gold)">{message}</p>}
    </div>
  );
}

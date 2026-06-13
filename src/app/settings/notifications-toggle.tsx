"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationsToggle() {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [state, setState] = useState<"loading" | "on" | "off" | "unsupported">(
    "loading"
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      if (!vapid) throw new Error("missing_vapid");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNote("Notifications were not allowed.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("save_failed");
      setState("on");
      setNote("Notifications on.");
    } catch {
      setNote("Couldn’t enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setState("off");
      setNote("Notifications off.");
    } catch {
      setNote("Couldn’t turn off notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") {
    return (
      <p className="text-xs text-(--color-ink-soft)">
        Notifications need the installed app. On iPhone: add Dossier to your Home
        Screen first, then enable here.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy || state === "loading"}
        onClick={state === "on" ? disable : enable}
        className="min-h-9 rounded-lg border border-(--color-gold-soft) px-4 py-2 text-sm font-medium transition hover:bg-(--color-gold-soft) disabled:opacity-50"
      >
        {state === "on" ? "Turn off notifications" : "Enable notifications"}
      </button>
      {note && <span className="text-xs text-(--color-gold)">{note}</span>}
    </div>
  );
}

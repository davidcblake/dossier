"use client";

import { useCallback, useEffect, useState } from "react";
import {
  authenticateWithBiometrics,
  isNativePlatform,
} from "@plugplay/native-bridge";

/**
 * App-wide Face ID / Touch ID gate for the native iOS shell (Plug and
 * Play). On the web — browser, PWA, local dev — it renders children
 * untouched; the biometric prompt only engages inside the native app,
 * where the OS falls back to the device passcode if biometrics are
 * unavailable or fail.
 */
export function NativeGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">(
    "checking"
  );

  const unlock = useCallback(async () => {
    setState("checking");
    const ok = await authenticateWithBiometrics("Unlock Dossier");
    setState(ok ? "open" : "locked");
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) {
      setState("open");
      return;
    }
    void unlock();
  }, [unlock]);

  if (state === "open") return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8 text-center">
      <span aria-hidden className="text-4xl">
        🔒
      </span>
      <div>
        <h1 className="font-(family-name:--font-serif) text-3xl font-semibold">
          Dossier
        </h1>
        <p className="mt-2 text-sm text-(--color-ink-soft)">
          {state === "checking"
            ? "Unlocking…"
            : "Locked. Unlock to see what’s waiting on you."}
        </p>
      </div>
      {state === "locked" && (
        <button
          type="button"
          onClick={unlock}
          className="min-h-9 rounded-lg border border-(--color-gold-soft) px-4 py-2 text-sm font-medium transition hover:bg-(--color-gold-soft)"
        >
          Unlock
        </button>
      )}
    </div>
  );
}

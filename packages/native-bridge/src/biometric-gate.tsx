import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { useEffect, useState, type ReactNode } from "react";
import { isNativePlatform } from "./platform";

export async function canUseBiometrics(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const check = await BiometricAuth.checkBiometry();
  return check.isAvailable;
}

export async function authenticateWithBiometrics(reason: string): Promise<boolean> {
  if (!isNativePlatform()) return true;
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  }
}

interface BiometricGateProps {
  /** Shown to the user in the Face ID / Touch ID system prompt. */
  reason: string;
  /** Rendered once authentication succeeds (or immediately, on web/dev). */
  children: ReactNode;
  /** Rendered while waiting on the biometric prompt, or if it's denied. */
  fallback: ReactNode;
}

/**
 * Drop this in front of a sensitive route (Dossier already classifies
 * "sensitive threads" and hides their content — this is the natural extra
 * layer for the app as a whole). No-ops to `children` on web so the same
 * page works in a browser during development.
 */
export function BiometricGate({ reason, children, fallback }: BiometricGateProps) {
  const [unlocked, setUnlocked] = useState(!isNativePlatform());

  useEffect(() => {
    if (unlocked) return;
    let cancelled = false;
    void authenticateWithBiometrics(reason).then((ok) => {
      if (!cancelled) setUnlocked(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [reason, unlocked]);

  return <>{unlocked ? children : fallback}</>;
}

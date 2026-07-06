import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Preferences } from "@capacitor/preferences";
import { isNativePlatform } from "./platform";

/**
 * Keychain-backed storage for anything auth-related (session/refresh
 * tokens). CLAUDE.md already rules out localStorage for auth state on
 * the web side — this is the native equivalent of that rule: never put a
 * token anywhere but the OS keystore.
 *
 * Falls back to Capacitor Preferences (still native, but not
 * hardware-backed) on web/dev so the same code path works before the app
 * ever runs inside the native shell. Do not rely on the web fallback for
 * production secrets — it's a dev convenience only.
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isNativePlatform()) {
    await SecureStoragePlugin.set({ key, value });
  } else {
    await Preferences.set({ key, value });
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (isNativePlatform()) {
      const result = await SecureStoragePlugin.get({ key });
      return result.value ?? null;
    }
    const result = await Preferences.get({ key });
    return result.value;
  } catch {
    // Both plugins throw when a key is absent rather than returning null.
    return null;
  }
}

export async function removeSecureItem(key: string): Promise<void> {
  if (isNativePlatform()) {
    await SecureStoragePlugin.remove({ key });
  } else {
    await Preferences.remove({ key });
  }
}

import { Capacitor } from "@capacitor/core";

/**
 * Every module in this package no-ops on web so the same app code runs
 * unmodified in a browser during development and inside the native shell
 * on a phone — callers never need an `if (native)` branch of their own.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

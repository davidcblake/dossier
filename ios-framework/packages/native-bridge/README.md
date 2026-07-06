# @plugplay/native-bridge

Shared Capacitor plugin plumbing so every Plug & Play app registers push,
stores tokens, and gates sensitive screens the same way, instead of each
app wiring these plugins up from scratch.

**Not yet installed in any app.** This is real TypeScript (typecheck it
with `pnpm typecheck`), but it hasn't been added as a workspace dependency
or exercised inside a Capacitor project yet — that's Phase 1/2 in
`../../docs/roadmap.md`, which needs a Mac (Xcode + CocoaPods) to do.

## What's here

| Module | Purpose |
| --- | --- |
| `push.ts` | Request permission, register for APNs, hand the device token to your app's own backend, and route a tapped notification to an in-app path. |
| `secure-storage.ts` | Keychain-backed get/set/remove for session tokens. Falls back to Capacitor Preferences on web for dev convenience only — never rely on the fallback for production secrets. |
| `biometric-gate.tsx` | `<BiometricGate reason="..." fallback={...}>` component — Face ID/Touch ID in front of a route. No-ops to unlocked on web. |
| `deep-link.ts` | Universal link / custom-scheme handling, so a push tap or shared link opens the right in-app screen. |

## Design rule

Every function checks `isNativePlatform()` and no-ops (or falls back)
on web. App code calls these the same way whether it's running in a
browser tab during `pnpm dev` or inside the native shell on a phone —
no `if (Capacitor.isNativePlatform())` branches scattered through app
code.

## Dependency versions

The `@capacitor/*` and community plugin versions in `package.json` are
placeholders based on the current Capacitor 6.x plugin ecosystem — pin
exact versions when this package is actually installed into an app
(Phase 1), since that's the point they'll be resolved and installed for
real.

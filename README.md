# Plug & Play — iOS Framework

Reusable plumbing so any Next.js/Vercel app (Dossier is the first) can
become a real, installable iPhone app — app icon, native push, Face ID,
offline shell — without re-solving auth, push, and native packaging from
scratch per app. This is the shared repo every consuming app plugs into.

**Status: framework skeleton + CI proven, not yet wired into a real app's
native build.** `native-bridge` is real TypeScript but not yet installed
anywhere; `docs/roadmap.md` has the phased plan and current status.

**Building/running an actual iOS app needs Xcode + CocoaPods on macOS.**
`.github/workflows/build-ios-app.yml` runs those steps on a GitHub-hosted
macOS runner (Simulator build, no signing/Apple account required), so a
personal Mac is optional — see `docs/distribution.md` and
`docs/roadmap.md` for exactly when a Mac is (and isn't) needed.

## Layout

```
docs/
  architecture.md       — why Capacitor + "remote mode", how a new app plugs in
  auth-integration.md   — shared login (Accounts JWT) design
  distribution.md       — free sideload vs TestFlight, and how to switch
  roadmap.md            — phased build-out, current status
packages/
  native-bridge/        — TS package: push registration, Keychain storage,
                           Face ID gate, deep links. Real code, installed
                           via `pnpm add @plugplay/native-bridge` once an
                           app reaches that phase.
capacitor-template/     — copyable Capacitor + Xcode project skeleton and
                           the script that scaffolds a consuming app's
                           ios/ folder
.github/workflows/
  build-ios-app.yml     — reusable workflow (workflow_call). Consuming
                           apps add a thin wrapper workflow that calls
                           this one instead of reimplementing the steps.
```

## How an app plugs in

See `docs/architecture.md` § "How a new app plugs in" for the full
sequence. Short version: add a thin `.github/workflows/ios-build.yml` in
the app's own repo that does
`uses: davidcblake/plug-and-play/.github/workflows/build-ios-app.yml@main`,
install `@plugplay/native-bridge` when ready to wire up native plugins,
and point login at the shared Accounts service instead of rolling your
own OAuth flow again.

## Read these in order

1. [`docs/architecture.md`](./docs/architecture.md)
2. [`docs/auth-integration.md`](./docs/auth-integration.md)
3. [`docs/distribution.md`](./docs/distribution.md)
4. [`docs/roadmap.md`](./docs/roadmap.md)

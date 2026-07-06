# Plug & Play — iOS Framework

Reusable plumbing so any app you build the way you build Dossier (Next.js on
Vercel, Postgres, Auth.js) can become a real, installable iPhone app —
app icon, native push, Face ID, offline shell — without re-solving auth,
push, and native packaging from scratch each time.

**Status: design phase.** Dossier is "app #0" — the first consumer this
framework will be wired into. Nothing here is plugged into Dossier's build
yet; that's Phase 2 (see `docs/roadmap.md`). Today's deliverable is the
architecture and the parts that are just TypeScript/config, which don't
need a Mac to write correctly.

**Hard constraint: this session runs on Linux.** Building, running, or
testing an actual iOS app requires Xcode + CocoaPods on a Mac. Everything
under this directory is designed to be finished on a Mac (yours, or a
future Mac-capable Claude Code session) — see `docs/roadmap.md` for exactly
where that handoff happens.

## Layout

```
ios-framework/
  docs/
    architecture.md       — why Capacitor + "remote mode", how a new app plugs in
    auth-integration.md   — shared login (Accounts JWT) design
    distribution.md       — free sideload vs TestFlight, and how to switch
    roadmap.md            — phased build-out, current status
  packages/
    native-bridge/        — TS package: push registration, Keychain storage,
                             Face ID gate, deep links. Real code, not yet
                             installed in any app.
  capacitor-template/      — copyable Capacitor + Xcode project skeleton and
                             the script that scaffolds a new app's ios/ folder
```

## Read these in order

1. [`docs/architecture.md`](./docs/architecture.md)
2. [`docs/auth-integration.md`](./docs/auth-integration.md)
3. [`docs/distribution.md`](./docs/distribution.md)
4. [`docs/roadmap.md`](./docs/roadmap.md)

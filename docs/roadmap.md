# Roadmap

## Repo history

This started as `ios-framework/` inside `davidcblake/dossier`, built and
proven there for two commits (Phase 0, Phase 0.1 below) before being split
out into this standalone repo (`davidcblake/plug-and-play`) via
`git subtree split --prefix=ios-framework` — full history preserved,
Dossier-specific paths already stripped since they were never part of the
prefix. Dossier now consumes this repo the way any app will: a thin
`.github/workflows/ios-build.yml` in its own repo that calls this repo's
reusable `build-ios-app.yml`.

## You don't actually need to own a Mac

GitHub-hosted `macos-14` Actions runners come with Xcode + CocoaPods
preinstalled. `.github/workflows/build-ios-app.yml` in this repo (a
reusable `workflow_call` workflow) uses one to run the exact `cap init` /
`cap add ios` / `cap sync` steps `new-app.sh` would run locally, then
builds for the **iOS Simulator with no signing and no Apple Developer
account required**. That covers "does the app actually build" entirely in
CI, for any app that calls it.

What CI *can't* do is put a build on your physical phone for Track A
(personal-team sideload is an interactive Xcode+device pairing flow) —
that one step still wants a Mac + your iPhone + a cable, once. Track B
(TestFlight) has no such limitation: cert/profile generation and
archive→export→upload are all scriptable and can run entirely in the same
CI workflow once you enroll (the workflow has a stubbed step waiting on
that). So: no Mac needed for CI validation today; a Mac is optional and
only matters for a one-time Track A sideload test, or not at all once
Track B is wired up.

## Phases

- [x] **Phase 0 — Framework skeleton.** Architecture, auth-integration,
      and distribution docs; `native-bridge` package (real TS, Capacitor
      plugin wrappers, not yet installed anywhere); `capacitor-template`
      config + `new-app.sh` skeleton.

- [x] **Phase 0.1 — CI-driven builds.** A workflow that generates `ios/`
      if missing, builds for iOS Simulator (no signing/account needed),
      uploads the generated project as an artifact, and has a stubbed
      TestFlight upload step gated on App Store Connect secrets.

- [x] **Phase 0.2 — Split into its own repo.** Extracted from
      `davidcblake/dossier` into `davidcblake/plug-and-play` (private),
      history preserved via `git subtree split`. The build workflow was
      converted from a self-contained job into a reusable
      `workflow_call` workflow so consuming apps invoke it with
      `uses:` instead of duplicating the steps.

- [ ] **Phase 1 — Get a build onto an actual phone.** Trigger Dossier's
      `ios-build.yml` (which calls this repo's `build-ios-app.yml`) from
      the Actions tab, download the `ios-project` artifact, and either:
      (a) open it in Xcode on a Mac once, sign with your personal Apple
      ID, install on your own device (Track A); or (b) skip straight to
      Phase 4 once you have an Apple Developer account.

- [ ] **Phase 2 — native-bridge wired into Dossier.** Install the
      `native-bridge` package for real, replace the web-push registration
      with native APNs registration, move session token storage to
      Keychain via the package's `secure-storage` module, add the
      biometric gate in front of sensitive-thread content.

- [ ] **Phase 3 — Accounts service extraction.** Stand up the shared
      login service per `auth-integration.md`, additive behind a flag,
      cut Dossier over once verified, keep a rollback path for one
      release.

- [ ] **Phase 4 — Distribution track B.** Once (if) you enroll in the
      Apple Developer Program: add App Store Connect API secrets to this
      repo, implement the archive/export/upload step already stubbed in
      `build-ios-app.yml`, invite friends/family as external testers.
      Every consuming app gets this for free the moment it's implemented
      here — no per-app CI work.

- [ ] **Phase 5 — Second app.** Point a second app's repo at this
      framework the same way Dossier does (thin workflow wrapper +
      `native-bridge` + Accounts). Any friction found there — a change
      needed in `new-app.sh`, `native-bridge`, or the reusable workflow —
      is the real validation that this framework is generic, not
      Dossier-specific.

## Current status

Phases 0 through 0.2 complete. This repo is now the single source of
truth for the framework; Dossier (and any future app) consumes it rather
than containing a copy. Next actionable step: Phase 1, or wiring a
second app's thin caller workflow to this repo's `build-ios-app.yml`.

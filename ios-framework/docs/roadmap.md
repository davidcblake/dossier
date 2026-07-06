# Roadmap

## Why the framework lives inside the Dossier repo for now

You asked for a single shared framework repo that every app plugs into
(rather than a copy-paste template) — that's the target end-state. But
this session only has write access to `davidcblake/dossier`, and
splitting the framework into its own repo before it's proven against a
real app would mean designing blind. So: build it here under
`ios-framework/`, prove it against Dossier (Phase 2-4 below), then split
it out with `git subtree split` once there's working code worth
protecting in its own repo (Phase 6). The directory is structured today so
that split is mechanical — nothing in it imports Dossier app code.

## You don't actually need to own a Mac

GitHub-hosted `macos-14` Actions runners come with Xcode + CocoaPods
preinstalled. `.github/workflows/ios-build.yml` (added in Phase 0.1) uses
one to run the exact `cap init` / `cap add ios` / `cap sync` steps
`new-app.sh` would run locally, then builds for the **iOS Simulator with
no signing and no Apple Developer account required**. That covers "does
the app actually build" entirely in CI.

What CI *can't* do is put a build on your physical phone for Track A
(personal-team sideload is an interactive Xcode+device pairing flow) —
that one step still wants a Mac + your iPhone + a cable, once. Track B
(TestFlight) has no such limitation: cert/profile generation and
archive→export→upload are all scriptable and can run entirely in the same
CI workflow once you enroll (the workflow has a stubbed step waiting on
that). So: no Mac needed for CI validation today; a Mac is optional and
only matters for a one-time Track A sideload test or if you'd rather do
everything locally instead of via Actions.

## Phases

- [x] **Phase 0 — Framework skeleton.** Architecture, auth-integration,
      and distribution docs; `native-bridge` package (real TS, Capacitor
      plugin wrappers, not yet installed anywhere); `capacitor-template`
      config + `new-app.sh` skeleton. No app has been touched.

- [x] **Phase 0.1 — CI-driven builds.** `.github/workflows/ios-build.yml`:
      manual trigger, macOS runner, generates `ios/` if missing, builds
      for iOS Simulator (no signing/account needed), uploads the
      generated project as an artifact, and has a stubbed TestFlight
      upload step gated on App Store Connect secrets. Trigger it from the
      Actions tab to validate the whole toolchain today.

- [ ] **Phase 1 — Get a build onto an actual phone.** Either: (a) run
      `ios-project` artifact from the workflow above through Xcode on a
      Mac once, sign with your personal Apple ID, install on your own
      device (Track A — needs a Mac, once); or (b) skip straight to (c)
      once you have an Apple Developer account. (c) Enroll, add App Store
      Connect API secrets to the repo, implement the archive/export/
      upload step in `ios-build.yml`, and get a TestFlight build to your
      phone with zero local Xcode use.

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
      Apple Developer Program: add App Store Connect API secrets to the
      repo, implement the archive/export/upload step already stubbed in
      `ios-build.yml`, invite friends/family as external testers.

- [ ] **Phase 5 — Second app + repo split.** Build or convert a second
      app against the by-then-proven framework. Where it needs a change
      to `new-app.sh` or `native-bridge`, that friction is the real
      validation the framework is generic, not Dossier-specific. Once
      two apps depend on it, split `ios-framework/` into its own repo via
      `git subtree split` and have both apps consume it as a git
      submodule or published package.

## Current status

Phases 0 and 0.1 complete. Nothing in Dossier's existing app code, build,
or dependencies has been modified — everything added is new, isolated
files under `ios-framework/` plus one new workflow file. Next actionable
step: trigger `ios-build.yml` from the Actions tab to confirm the
Simulator build actually passes.

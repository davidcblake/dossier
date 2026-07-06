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

## Phases

- [x] **Phase 0 — Framework skeleton (this change).** Architecture,
      auth-integration, and distribution docs; `native-bridge` package
      (real TS, Capacitor plugin wrappers, not yet installed anywhere);
      `capacitor-template` config + `new-app.sh` skeleton. No app has been
      touched. Everything buildable on Linux is built; everything that
      needs Xcode is documented, not faked.

- [ ] **Phase 1 — Capacitor shell on Dossier (needs a Mac).** Add
      `ios/` to the Dossier repo in "remote mode" pointed at the deployed
      Vercel URL; get it running in the iOS Simulator, then on your own
      phone via Track A sideload (`distribution.md`). This is the first
      point where the framework produces something you can tap on your
      phone. **Requires Xcode + CocoaPods** — cannot be done from this
      Linux session; needs a Mac-based session or your own machine.

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
      Apple Developer Program, flip `DISTRIBUTION=testflight`, wire the
      App Store Connect API key into CI, invite friends/family as
      external testers.

- [ ] **Phase 5 — CI.** A macOS GitHub Actions workflow that builds any
      app plugged into the framework and either uploads a sideload
      artifact or pushes to TestFlight, parameterized by app name.

- [ ] **Phase 6 — Second app + repo split.** Build or convert a second
      app against the by-then-proven framework. Where it needs a change
      to `new-app.sh` or `native-bridge`, that friction is the real
      validation the framework is generic, not Dossier-specific. Once
      two apps depend on it, split `ios-framework/` into its own repo via
      `git subtree split` and have both apps consume it as a git
      submodule or published package.

## Current status

Phase 0, complete as of this change. Nothing in Dossier's existing
app code, build, or dependencies has been modified — everything added is
new, isolated files under `ios-framework/`.

# capacitor-template

The copyable pieces of a Capacitor "remote mode" project (see
`../docs/architecture.md`):

- `capacitor.config.ts.template` — filled in by `scripts/new-app.sh` with
  the app's name, bundle id, and deployed URL.
- `scripts/new-app.sh` — scaffolds `ios/` in a target app's repo. **Must
  be run on macOS** with Xcode + CocoaPods installed; see the comment
  block at the top of the script and `../docs/roadmap.md` Phase 1.

Nothing here has been run yet — Dossier does not have an `ios/` folder.
This is the tooling that will produce one once a Mac-capable session or
your own machine runs Phase 1.

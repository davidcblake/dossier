# capacitor-template

The copyable pieces of a Capacitor "remote mode" project (see
`../docs/architecture.md`):

- `capacitor.config.ts.template` — filled in by `scripts/new-app.sh` with
  the app's name, bundle id, and deployed URL.
- `scripts/new-app.sh` — scaffolds `ios/` in a target app's repo. **Must
  be run on macOS** with Xcode + CocoaPods installed; see the comment
  block at the top of the script and `../docs/roadmap.md` Phase 1.

Nothing here has been run against a real app yet. This is the tooling
that produces an `ios/` folder once you run it against a consuming app's
repo (locally on a Mac, or via `.github/workflows/build-ios-app.yml`,
which runs the same steps on a GitHub-hosted macOS runner).

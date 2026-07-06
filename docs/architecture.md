# Architecture

## The problem

Every app you build (Dossier today; more later) is a Next.js app on Vercel
with server-side rendering, API routes, a Postgres DB, and Google OAuth.
That's a full backend, not a static site — it can't just be zipped into an
app bundle. What repeats across apps isn't the product logic, it's the
plumbing: getting a native app icon on your phone, real push notifications,
secure token storage, a Face ID gate on sensitive screens, and a way to
hand a build to family without Xcode or cables. That plumbing is what this
framework owns.

## The approach: Capacitor, in "remote mode"

[Capacitor](https://capacitorjs.com) wraps a web app in a thin native iOS
shell (a `WKWebView` plus a JS↔native bridge for plugins). There are two
ways to point that shell at your app:

- **Bundled mode** — `next export` a static build and ship it inside the
  `.ipa`. Works offline, but only for apps with no server-side
  rendering/API routes. Dossier's cron, Gmail/Calendar API calls, and
  Prisma-backed routes rule this out.
- **Remote mode (chosen)** — the native shell just loads your deployed
  Vercel URL (`https://dossier.vercel.app`) in the `WKWebView`, the same
  way Safari would, except now it has a real app icon, a splash screen,
  and native plugin access. Every `git push` to `main` that redeploys on
  Vercel *is* the app update — no separate native release needed for
  ordinary product changes. You only touch the native project when you
  change something native (push, biometrics, icon, permissions).

Remote mode is what makes this "plug and play": onboarding a new app is
"point the shell at a URL," not "rebuild the frontend for a second
runtime." The tradeoff is that the app is unusable with zero connectivity —
acceptable for these apps (Dossier already assumes a live API for
Gmail/Calendar/AI calls); a cached offline shell (already planned for the
PWA — see `sw.js`) covers the "briefly offline" case.

## What the native shell adds that a home-screen PWA doesn't

Dossier already has a solid PWA (installable, offline shell, iOS meta
tags — see root `CLAUDE.md`). A native shell on top of that buys:

- A real entry in the App Library / Settings, not a Safari bookmark —
  easier for non-technical friends/family to find and trust.
- Reliable **native push via APNs**, instead of depending on iOS Safari's
  web-push support (which works from 16.4+ but is a second-class citizen
  Apple has been known to regress).
- **Keychain-backed secure storage** for session tokens (rather than
  `localStorage`/IndexedDB, which CLAUDE.md already rules out for auth
  state).
- **Face ID / Touch ID gate** in front of sensitive content — relevant
  given Dossier already classifies "sensitive threads" and hides their
  content; a biometric gate is a natural extra layer for the whole app.
- Native share sheet, haptics, and a TestFlight/App Store-shaped
  distribution story for sharing with people who aren't you.

## Repo layout

This is its own repo (`davidcblake/plug-and-play`), separate from any app
that consumes it — Dossier included. That split was deliberate from the
start (see `roadmap.md`): a shared framework repo that every app plugs
into, rather than a copy-paste template duplicated per app.

```
plug-and-play/                  (this repo)
  docs/                         architecture, auth, distribution, roadmap
  packages/
    native-bridge/               TS package: push, secure storage,
                                  biometric gate, deep links — the plugin
                                  plumbing every app installs
    accounts/                   (planned, see auth-integration.md) — the
                                  shared login service
  capacitor-template/
    capacitor.config.ts.template    remote-mode config, URL is a placeholder
    scripts/new-app.sh              scaffolds ios/ for a consuming app (needs a Mac)
  .github/workflows/
    build-ios-app.yml               reusable workflow (workflow_call) —
                                     consuming apps call this instead of
                                     reimplementing the build steps

dossier/                        (a separate repo, the first consumer)
  .github/workflows/ios-build.yml   thin wrapper that calls this repo's
                                     build-ios-app.yml with its own inputs
```

Nothing here is wired into Dossier's build yet — Dossier stays a plain
Next.js app. Its `ios-build.yml` only calls out to this repo's reusable
workflow; no native-bridge dependency, no `ios/` folder, until Phase 2
(`roadmap.md`) actually installs the package.

## How a new app plugs in

1. In the consuming app's repo, add a thin `.github/workflows/ios-build.yml`
   that does `uses: davidcblake/plug-and-play/.github/workflows/build-ios-app.yml@main`
   with `app_name` / `bundle_id` / `remote_url` inputs — this generates
   `ios/` (if missing) and builds it for the iOS Simulator, no local Xcode
   or Apple account required.
2. `pnpm add @plugplay/native-bridge` (published from `packages/native-bridge`
   in this repo) wires up push registration, secure storage, and the
   biometric gate with a few lines of app code — same API Dossier uses.
3. The app's login page redirects to the shared Accounts service instead
   of running its own Auth.js Google flow (see `auth-integration.md`).
4. Once Track B is set up (`distribution.md`), the same reusable workflow's
   TestFlight step handles archive/export/upload — no per-app CI work.

Everything native (push, biometrics, icon) is app-specific config over a
shared plugin API; everything account-related is one shared service. The
per-app work that's left is exactly the product itself.

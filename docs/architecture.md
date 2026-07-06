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

Framework code lives alongside Dossier in this repo for now (see
`roadmap.md` for why, and when it gets split out):

```
dossier/                       (unchanged — the Next.js app, repo root)
ios-framework/
  docs/                        architecture, auth, distribution, roadmap
  packages/
    native-bridge/              TS package: push, secure storage,
                                 biometric gate, deep links — the plugin
                                 plumbing every app installs
    accounts/                  (planned, see auth-integration.md) — the
                                 shared login service
  capacitor-template/
    capacitor.config.ts.template   remote-mode config, URL is a placeholder
    scripts/new-app.sh             scaffolds ios/ for a new app (needs a Mac)
```

Nothing here is wired into Dossier's `apps/` build yet. Dossier stays a
plain Next.js app until Phase 2 (roadmap) adds a `pnpm-workspace.yaml` and
an `ios/` folder to it as the first real consumer.

## How a new app plugs in (target end-state)

Once Phase 2 is done, bringing up app #2 should look like:

1. `./ios-framework/capacitor-template/scripts/new-app.sh <name> <vercel-url> <bundle-id>`
   scaffolds `ios/` in that app's repo with Capacitor already pointed at
   its deployed URL.
2. `pnpm add @plugplay/native-bridge` (workspace package) wires up push
   registration, secure storage, and the biometric gate with a few lines
   of app code — same API Dossier uses.
3. The app's login page redirects to the shared Accounts service instead
   of running its own Auth.js Google flow (see `auth-integration.md`).
4. `./scripts/build.sh <name>` produces either a local sideload build or
   a TestFlight upload, depending on which distribution track is
   configured (see `distribution.md`).

Everything native (push, biometrics, icon) is app-specific config over a
shared plugin API; everything account-related is one shared service. The
per-app work that's left is exactly the product itself.

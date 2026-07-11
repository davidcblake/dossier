# Dossier

Your inbox's chief of staff. A daily AI scan of your Gmail produces a
prioritized digest, a persistent running action list, one-tap calendar adds,
and approval-gated reply drafts. Dossier never sends email and never deletes
anything.

- Product spec: [`dossier-prd.md`](./dossier-prd.md)
- Build guide & ground rules: [`CLAUDE.md`](./CLAUDE.md)
- Operator setup: [`docs/google-cloud-setup.md`](./docs/google-cloud-setup.md)
- iOS app framework (shared plumbing to turn this and future apps into
  installable iPhone apps): [davidcblake/plug-and-play](https://github.com/davidcblake/plug-and-play)
  (private repo; this app's `.github/workflows/ios-build.yml` calls its
  reusable build workflow)

## Stack

Next.js (App Router, TypeScript) · Prisma + Postgres · Auth.js (Google OAuth)
· Anthropic API · Web Push · PWA · Vercel

## Development

```bash
pnpm install
cp .env.example .env   # fill in values — see docs/google-cloud-setup.md
pnpm db:push           # sync schema to your Postgres
pnpm dev
```

Run tests (required before any phase is considered done):

```bash
pnpm test
```

## Build status

- [x] **Phase 1 — Scaffold:** Next.js + Prisma + Auth.js Google OAuth (read/compose/calendar scopes only), encrypted refresh-token storage
- [x] **Phase 2 — Read loop:** “Scan now” → Gmail fetch → sensitivity pass (Haiku) → triage/synthesis (Sonnet) → reconcile/persist → render /today. Requires `ANTHROPIC_API_KEY`.
- [x] **Phase 3 — Actions:** voice-aware reply drafts (Gmail Drafts only, 403 on sensitive), one-tap calendar add (timeTbd → all-day, 60-min reminder), item done/dismiss/reopen, settings with calendar picker / signature / voice sample
- [x] **Phase 4 — Running list + thumb-first UX:** `/list` (Open sorted priority→deadline→age with “waiting N days”, collapsible Done, manual add), tap-to-complete with elegant collapse animation, per-item complete / snooze 2d (⏰) / delete (🗑️), bottom nav with Settings gear, prescriptive AI prioritization, interactive calendar candidates (date+time, Add → confirmed, remove/dismiss)
- [x] **PWA (iPhone):** installable manifest + icons + iOS meta, update-safe service worker (network-first), offline fallback, Add-to-Home-Screen hint
- [x] **AI-native learning + autopilot:** a learned profile built from your actions (titles/actions only — never raw or sensitive content) that personalizes prioritization and drafts; autopilot levels (suggest / auto-prepare drafts / proactive) that pre-write drafts to Gmail for approval. Never sends; calendar stays one-tap.
- [x] **Phase 5 — Schedule + push:** hourly Vercel Cron (`/api/cron/scan`, `CRON_SECRET`-gated) fans out to users whose local time matches `digestHour`, scans, and sends a Web Push digest; notifications opt-in in Settings; service-worker push handlers
- [x] **Brand:** Dossier identity applied — cream/ink/oxblood palette, Courier Prime wordmark, real app icons (see `docs/BRAND.md`)
- [ ] Phase 6 — Onboarding wizard, needs_reconnect flow, privacy/terms, account deletion
- [ ] Phase 6 — Polish (onboarding, voice, reconnect, privacy)
- [ ] Phase 7 — Beta hardening

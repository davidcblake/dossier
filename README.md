# Dossier

Your inbox's chief of staff. A daily AI scan of your Gmail produces a
prioritized digest, a persistent running action list, one-tap calendar adds,
and approval-gated reply drafts. Dossier never sends email and never deletes
anything.

- Product spec: [`dossier-prd.md`](./dossier-prd.md)
- Build guide & ground rules: [`CLAUDE.md`](./CLAUDE.md)
- Operator setup: [`docs/google-cloud-setup.md`](./docs/google-cloud-setup.md)

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
- [ ] Phase 3 — Actions (drafts, calendar add, item status)
- [ ] Phase 4 — Running list
- [ ] Phase 5 — Schedule + push + PWA
- [ ] Phase 6 — Polish (onboarding, voice, reconnect, privacy)
- [ ] Phase 7 — Beta hardening

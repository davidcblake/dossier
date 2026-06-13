# CLAUDE.md — Dossier

Dossier is a PWA that acts as an inbox chief of staff: a daily AI scan of the user’s Gmail produces a prioritized digest, a persistent running action list, one-tap calendar adds, and approval-gated reply drafts. See `dossier-prd.md` for full product context. This file is your build guide.

## Non-negotiable product rules (enforce in code, not just prompts)

1. **NEVER request or use Gmail send scope.** Drafts only (`gmail.compose` + `gmail.readonly`). There must be no code path that sends email.
1. **Never delete/archive mail. Never modify/delete calendar events Dossier didn’t create.**
1. **Sensitive threads** (HR, health, financial hardship, legal, ecclesiastical/pastoral, “confidential”): run a classification pass FIRST; flagged threads are excluded from digest-detail and draft prompts entirely — UI shows only “🔒 Confidential matter” + Gmail deep-link. Never store their content.
1. **Raw email bodies are never persisted.** Process in memory per scan; store only item metadata (title, summary, threadId, dates).
1. Calendar adds are always explicit one-tap confirms in the UI — the cron never writes to calendar silently.

## Stack

- **Next.js 14+ (App Router, TypeScript)** deployed on **Vercel**
- **Postgres via Supabase** (or Vercel Postgres) + Prisma
- **Auth:** Auth.js (NextAuth) with Google provider; offline access; store refresh tokens encrypted (AES-256-GCM, key in env)
- **Scheduling:** Vercel Cron hitting `/api/cron/scan` hourly; route fans out to users whose `digestHour` (in their timezone) matches
- **AI:** Anthropic API. `claude-haiku-*` for sensitivity classification + thread triage; `claude-sonnet-*` for digest synthesis + drafts. All AI calls expect strict JSON; validate with Zod, retry once on parse failure
- **Push:** Web Push (VAPID) via `web-push`; service worker for PWA + notifications
- **PWA:** manifest.json, icons, offline shell; iOS meta tags; in-app “Add to Home Screen” instructions for Safari

## Google Cloud setup (document for the operator, automate nothing secret)

- OAuth consent screen in **Testing** mode; add beta users as test users (≤100)
- Scopes: `openid email profile`, `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.compose`, `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/calendar.events`
- Testing mode = refresh tokens expire after 7 days: implement graceful re-auth (detect `invalid_grant`, set user state `needs_reconnect`, send push/email “Reconnect Dossier”, one-tap re-auth)

## Data model (Prisma sketch)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  signature     String?          // for drafts, e.g. "President Blake"
  voiceSample   String?          // pasted sent-mail excerpts
  timezone      String   @default("America/Denver")
  digestHour    Int      @default(7)
  calendarId    String?          // target Google calendar
  pushSub       Json?
  googleAccount GoogleAccount?
  items         ActionItem[]
  digests       Digest[]
  status        String   @default("active") // active | needs_reconnect
}

model GoogleAccount {
  userId       String @id
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken String // encrypted
  accessToken  String?
  expiresAt    DateTime?
}

model ActionItem {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title           String
  summary         String?  // null when sensitive
  waitingOn       String?
  deadline        DateTime?
  priority        Int      @default(2)
  sensitive       Boolean  @default(false)
  recommendedStep String?
  threadId        String?
  replyToMessageId String?
  status          String   @default("open") // open|done|dismissed|auto_resolved
  draftId         String?  // gmail draft id once created
  eventId         String?  // calendar event id once added
  firstSeen       DateTime @default(now())
  resolvedAt      DateTime?
  @@unique([userId, threadId])
}

model Digest {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date      DateTime
  fyi       Json     // [{title, summary}]
  calendar  Json     // calendar candidates incl. timeTbd
  stats     Json     // counts for the push copy
}
```

## Scan pipeline (`/api/cron/scan` → per-user job)

1. Refresh access token; on `invalid_grant` mark `needs_reconnect`, notify, skip
1. Gmail: `threads.list q="in:inbox newer_than:7d"` + threads of open ActionItems; `threads.get` (format=metadata first, full only for candidates); trim each message body to ~1,500 chars, strip quoted history
1. **Pass A — sensitivity (Haiku):** per thread → `{sensitive: bool, category}`; sensitive threads bypass Pass B
1. **Pass B — triage+synthesis (Sonnet):** all non-sensitive threads in one prompt → strict JSON `{actionItems[], calendarItems[], fyi[]}` per PRD §7.2 (include threadId + last messageId per item)
1. **Reconcile:** upsert by `(userId, threadId)`; if user’s address is the latest sender on an open item’s thread → `auto_resolved`; sensitive items stored title-only
1. Persist Digest; send push: “Dossier: {n} things waiting on you” (deep-link to /today)
1. Wrap per-user job in try/catch; one user’s failure never blocks the fan-out. Log to console (Vercel logs) with userId

## API routes

- `POST /api/items/:id/draft` → load thread, build voice-aware prompt, Gmail `drafts.create` (threaded reply), save draftId. 403 if item.sensitive
- `POST /api/items/:id/calendar` → insert event on user.calendarId (timeTbd → all-day), 60-min popup reminder, save eventId
- `POST /api/items/:id/status` → done/dismissed/reopen
- `POST /api/items` → manual item
- `POST /api/push/subscribe`, `DELETE /api/account` (hard delete + token revoke)
- `GET /api/cron/scan` protected by `CRON_SECRET` header check

## UI (mobile-first, this is a phone product)

- `/today` — the digest: reminder banners (overdue / due ≤2 days), action cards (checkbox, 🔒 badge, deadline chip, waiting-on, recommended step, [Draft reply] [Add to calendar] buttons, Gmail link), calendar candidates, collapsed FYI
- `/list` — running action list grouped Open (sorted priority→deadline→age, age shown as “waiting N days”) / Done
- `/settings` — digest hour, calendar picker, voice sample, signature, notifications, reconnect Google, delete account
- Onboarding wizard per PRD §7.1
- Design: warm paper background, deep navy ink, serif display headers (Cormorant Garamond) + Inter body, gold accent for urgent — calm, dignified, not another gray SaaS dashboard. Reuse the look of the validated prototype (`stake-daily-brief.jsx` in repo `/reference`)

## Env vars

`DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET, ANTHROPIC_API_KEY, TOKEN_ENC_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET, APP_URL`

## Build phases (work in this order; stop and verify after each)

1. **Scaffold:** Next.js + Prisma + Auth.js Google OAuth with all scopes; deploy to Vercel; verify login stores encrypted refresh token
1. **Read loop:** manual “Scan now” button → pipeline steps 2–5 → render /today from DB
1. **Actions:** draft creation, calendar add (with calendar picker in settings), item status; verify a draft lands threaded in Gmail Drafts
1. **Running list:** /list view, rollover + auto-resolve logic, manual items
1. **Schedule + push:** Vercel Cron, per-user hour fan-out, web push, PWA manifest + service worker, iOS install flow
1. **Polish:** onboarding wizard, voice sample → drafts, needs_reconnect flow, privacy/terms pages, account deletion
1. **Beta hardening:** rate limits, Sentry or console-structured logging, seed script, invite flow (allowlist table checked at sign-in)

## Testing expectations

- Unit-test reconcile logic (dedupe, auto-resolve, rollover) and the Zod schemas for AI JSON
- Integration-test pipeline with fixture threads (include a sensitive fixture: verify it never reaches Pass B prompt or DB summary)
- A `pnpm test` that passes is required before each phase is “done”

## Things NOT to do

- No send-mail code paths, even behind flags
- No storing raw bodies or sensitive summaries
- No silent calendar writes from cron
- No localStorage for auth state
- Don’t widen OAuth scopes without explicit operator instruction
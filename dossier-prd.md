# Dossier — Product Requirements Document

**Version:** 1.0 (Friends & Family Beta) · **Owner:** Dave Blake · **Date:** June 2026

## 1. Vision

Dossier is your inbox’s chief of staff. Once a day it reads your email, tells you exactly what’s waiting on you, keeps a running list of action items until they’re done, puts events on your calendar so you never miss a meeting, and preps reply drafts for your approval. It never sends anything itself, and it knows when a thread is sensitive.

**Tagline candidates:** “Know what’s waiting on you.” / “Your daily brief, every inbox.”

## 2. Origin & proof

Prototyped June 2026 as a personal agent for a stake presidency inbox. The full loop was validated manually: scan → prioritized action items → calendar additions → approval-gated drafts. Dossier productizes that loop for anyone.

## 3. V1 scope (Friends & Family, ≤100 users)

### In scope

1. **Google sign-in + Gmail connect** (read + drafts scopes only — never send scope)
1. **Daily automated scan** (Vercel Cron, per-user preferred hour) of the last 7 days of inbox
1. **Daily Digest** — prioritized action items, calendar candidates, FYI summaries
1. **Running Action List** — items persist across days until checked off; unresolved items roll forward and age visibly (“waiting 4 days”)
1. **Calendar integration** — one-tap add to a user-selected Google Calendar (user picks which calendar at onboarding; default = primary)
1. **Draft replies** — generated in the user’s voice, saved to Gmail Drafts only; user reviews and sends in Gmail
1. **Sensitive-thread detection** — confidential matters (HR, health, finances, ecclesiastical, legal) are flagged 🔒 with details withheld; no AI drafts offered
1. **PWA install** — Add to Home Screen on iOS/Android; full-screen, app icon
1. **Push notification** when the daily digest is ready (iOS 16.4+; email fallback)

### Out of scope for v1

Outlook/IMAP, team features, sending email, multi-account, native iOS/Android apps, Google verification (runs in Testing mode).

### V1 constraints to communicate to users

- Google Testing mode: OAuth token expires every 7 days → weekly re-login (goes away after verification)
- Gmail only

## 4. Users

- **Beta:** Dave + ~10–25 friends (busy professionals, church leaders, parents — people with “responsibility inboxes”)
- **Later:** anyone whose inbox is a to-do list they’re afraid of

## 5. Core user stories

1. As a user, I connect my Gmail in under 2 minutes and pick my digest hour and target calendar.
1. Every morning I get a push: “Dossier: 3 things waiting on you.” I open it and see them ranked, each with who’s waiting, the deadline, and a recommended next step.
1. I tap “Draft reply” → a draft appears in my Gmail Drafts; I edit and send it myself.
1. I tap “Add to calendar” → the event lands on my chosen calendar with a reminder. TBD times become all-day placeholders.
1. Items I don’t finish today are still on my list tomorrow, marked older.
1. A sensitive thread shows as “🔒 Confidential matter — review in Gmail” with no details leaked into the digest.
1. I check items off and feel like a functioning adult.

## 6. Product principles (non-negotiable)

1. **Never send.** Dossier composes; humans send. No send scope is ever requested.
1. **Discretion by default.** Sensitive content is detected, flagged, and never elaborated.
1. **Nothing destructive.** Never delete or archive mail; never modify or delete existing calendar events.
1. **The list is the product.** The running action list — not the inbox — is the user’s home screen.
1. **When uncertain, ask.** Ambiguity becomes a question in the digest, not a guess.

## 7. Functional spec

### 7.1 Onboarding

Google OAuth (scopes: `gmail.readonly`, `gmail.compose`, `calendar.events`, `calendar.readonly`) → pick digest hour → pick target calendar from their calendar list → optional voice sample (“paste 2–3 sent emails so drafts sound like you”) → name/signature for drafts → install-PWA prompt → enable notifications.

### 7.2 Daily scan engine (per user, at their hour)

1. Fetch inbox threads from last 7 days + all threads attached to open action items
1. For each thread, build a compact representation (participants, dates, last 2–3 message bodies trimmed)
1. Claude analysis pass produces structured JSON:
- `actionItems[]`: title, summary, waitingOn, deadline, priority (1–3), sensitive (bool), recommendedStep, needsReply, threadId, replyToMessageId, suggestedEvent
- `calendarItems[]`: title, date, start/end, location, timeTbd
- `fyi[]`: title, one-line summary
1. Reconcile with the running list: match to existing open items by threadId (update, don’t duplicate); auto-resolve items whose thread shows the user replied; new items appended
1. Store digest; send push notification

### 7.3 Running Action List

States: `open → done | dismissed | auto-resolved`. Each item shows age, deadline countdown, source thread deep-link (`https://mail.google.com/mail/u/0/#inbox/<threadId>`). Manual “Add item” allowed.

### 7.4 Drafts

On tap: Claude generates reply using thread context + user voice profile → saved via Gmail drafts API as a reply on the thread → UI links to the draft. Sensitive threads: button replaced with “Handle personally” note.

### 7.5 Sensitive detection

Classifier criteria: personnel/HR, health, financial hardship, legal, ecclesiastical/pastoral matters, anything marked confidential. When flagged: digest shows generic title only; no summary, no draft; thread link only. Sensitivity flag stored, raw content never stored.

### 7.6 Notifications

Web Push (VAPID). Daily digest push + optional “due today” morning nudge. Email fallback if push unsupported/declined.

## 8. Data & privacy

- Store: user profile, OAuth tokens (encrypted at rest), action items (title/summary/metadata), digest history, calendar/draft receipts
- Do NOT store: raw email bodies (processed in-memory per scan), sensitive-thread contents (metadata + threadId only)
- Delete account = hard delete of all rows + token revocation
- Privacy policy and Terms pages required before inviting friends (also required later for Google verification)

## 9. Success metrics (beta)

- ≥60% of invited users complete onboarding
- ≥50% weekly active after 3 weeks (despite 7-day re-auth friction)
- ≥3 action items checked off per active user per week
- Qualitative: “I’d be annoyed if this went away” from ≥5 friends

## 10. Roadmap after v1

1. Google verification + CASA security assessment (removes 7-day token expiry, opens public signup)
1. Outlook/Microsoft 365
1. Snooze/delegate items; weekly review view
1. Billing (likely $8–12/mo prosumer)
1. Native iOS wrapper if PWA notifications prove insufficient

## 11. Risks

|Risk                                |Mitigation                                                                                    |
|------------------------------------|----------------------------------------------------------------------------------------------|
|7-day token expiry annoys beta users|Set expectation up front; one-tap re-auth flow; push “reconnect” reminder                     |
|Gmail API quota                     |Per-user incremental scans, batch requests, 7-day window cap                                  |
|LLM cost per scan                   |Compact thread representations; cap threads/scan; Haiku for classification, Sonnet for drafts |
|Hallucinated deadlines/events       |Show source thread for every item; calendar adds always one-tap confirm, never silent         |
|Sensitive leakage                   |Dedicated classification pass runs FIRST; flagged threads excluded from all downstream prompts|
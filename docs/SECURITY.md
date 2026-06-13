# Dossier — Security Posture

How Dossier protects your email, calendar, and account data.

## Access — least privilege
- **Drafts only, never send.** Gmail scopes are `gmail.readonly` + `gmail.compose`. There is no send-mail code path anywhere in the codebase; a scope allowlist throws at build/runtime if a send/modify scope is ever introduced (`src/lib/google-scopes.ts`, unit-tested).
- **No destructive actions.** Mail is never deleted or archived. Calendar events are only ever created (one tap) or removed if Dossier itself created them — it never touches events you made.

## Data at rest
- **OAuth tokens are encrypted** with AES-256-GCM before storage (`TOKEN_ENC_KEY`, 32-byte key in env). Refresh and access tokens are never stored in plaintext (`src/lib/crypto.ts`, unit-tested incl. tamper/wrong-key cases).
- **Raw email bodies are never persisted.** They are processed in memory during a scan; only metadata (title, short summary, dates, thread id) is stored.
- **Sensitive threads** (HR, health, finances, legal, ecclesiastical, confidential) are detected first and excluded from all AI prompts and storage — only a generic "Confidential matter" marker is kept.

## Authentication & authorization
- Google OAuth via Auth.js; sessions are signed JWTs in `__Secure-`, HttpOnly, SameSite cookies.
- **Every API route requires a session** and is **owner-scoped** — items/drafts/calendar/account operations are filtered by the signed-in user's id (no cross-user access).
- The cron endpoint is gated by `CRON_SECRET`; the diagnostics endpoint requires a session or the cron secret.
- **Sign-in allowlist** (`ALLOWED_EMAILS`, optional) restricts who can sign in, on top of Google keeping the OAuth app in Testing mode (only added test users can authenticate).

## Transport & browser hardening
- HTTPS everywhere (HSTS preload).
- Strict security headers: Content-Security-Policy (same-origin), `X-Frame-Options: DENY` + `frame-ancestors 'none'` (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a locked-down `Permissions-Policy` (`next.config.ts`).

## Account control
- **Delete account** removes all your data (cascades across items/digests/calendar) and **revokes Google access** via Google's token-revocation endpoint.
- Tokens also expire weekly in Google Testing mode; reconnect is one tap.

## Secrets
All secrets live in environment variables (never in the repo): `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `AUTH_SECRET`, `TOKEN_ENC_KEY`, `ANTHROPIC_API_KEY`, `VAPID_*`, `CRON_SECRET`.

## Still on the roadmap (beta hardening)
Rate limiting, structured audit logging, and Google's formal CASA security assessment (required to leave Testing mode and remove the 7-day token expiry).

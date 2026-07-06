# Shared login (Accounts)

## What "shared auth" does and doesn't mean here

Two different things are bundled under "auth" and it matters to keep them
separate:

1. **Who is signed in** — the identity/session layer. Today Dossier solves
   this itself with Auth.js + Google OAuth + a signed session cookie. If
   you build a second app, you'd otherwise copy that whole flow again.
2. **What an app is allowed to do on your behalf** — Dossier's specific
   Gmail (`readonly`, `compose`) and Calendar (`readonly`, `events`)
   scopes, consented to once per Google Cloud OAuth client and stored as
   Dossier's own encrypted refresh token (`docs/SECURITY.md`).

**(1) is what gets shared. (2) stays per-app.** Google's consent model is
inherently per-OAuth-client — there's no way to consent to Gmail scopes
once and hand them to a second, unrelated app, nor should there be
(least-privilege: an app that only needs to be "logged in" shouldn't also
be carrying Gmail access). So the shared piece is exactly the login
session/JWT; each app that needs its own Google API scopes still runs its
own consent screen and keeps its own encrypted token in its own DB, the
same way Dossier does today. What you stop repeating is the session
plumbing: cookie/JWT issuance, refresh, expiry, and the
`invalid_grant` → `needs_reconnect` → reconnect-prompt dance — that
becomes a shared library instead of hand-rolled per app.

## Design: a small Accounts service

A standalone, minimal Next.js deployment (its own Vercel project, e.g.
`accounts.<yourdomain>.com`) that is the *only* place Google OAuth for
"who are you" happens:

- Auth.js + Google provider, same Google Cloud project as today (`openid
  email profile` scope only — no Gmail/Calendar scopes here, those aren't
  its job).
- Owns one small `User` table: `id, email, name, createdAt`. This is the
  cross-app identity — Dossier's own `User` row (with its Gmail refresh
  token, digestHour, signature, etc.) keys off this `id` but stays in
  Dossier's own database. No shared database, no cross-app data coupling.
- Issues a short-lived **access JWT** (RS256, ~15 min, claims: `sub`,
  `email`, `iat`/`exp`) plus a rotating **refresh token**.
- Publishes its public key at a JWKS endpoint
  (`/.well-known/jwks.json`), so any app can verify a JWT locally —
  no network call back to Accounts on every request, no shared secret to
  distribute.

## Session flow

**Web app (e.g. Dossier's Next.js frontend):**
1. Unauthenticated request → redirect to
   `accounts.<domain>/login?redirect_uri=https://dossier.vercel.app/api/auth/callback`.
2. User signs in with Google at Accounts (once, ever, across all your
   apps — subsequent apps just get silently redirected back if the
   Accounts session cookie is already live).
3. Accounts redirects back with a short-lived code; Dossier's callback
   exchanges it for the access JWT + refresh token.
4. Access JWT → `__Secure-`, HttpOnly, SameSite cookie on Dossier's own
   domain (same posture as today, per `docs/SECURITY.md`); Dossier
   verifies it locally via the JWKS on every request instead of running
   its own Auth.js session.
5. If Dossier itself needs Gmail/Calendar, *that* consent screen still
   happens inside Dossier, right after step 4, exactly as it does today —
   unchanged.

**Native app (Capacitor shell):**
1. Shell opens the Accounts login URL in an in-app browser
   (`@capacitor/browser` or `ASWebAuthenticationSession` under the hood)
   so cookies/session state are shared with Safari if you're already
   logged in elsewhere.
2. On success, the redirect carries the JWT + refresh token back to the
   shell via a custom URL scheme / universal link.
3. `native-bridge`'s `secure-storage` module puts the refresh token in
   iOS Keychain (never `localStorage`, matching the existing CLAUDE.md
   rule); the access JWT is held in memory and silently refreshed.

## Migration path for Dossier

Dossier's current Auth.js setup is not broken and shouldn't be ripped out
speculatively. Recommended order (tracked in `roadmap.md` as Phase 3):

1. Stand up Accounts as a new, empty service — no apps depend on it yet.
2. Add Accounts as an *additional* trusted issuer Dossier's middleware can
   verify, behind a flag, while Auth.js keeps working — so this is
   additive, not a cutover.
3. Flip Dossier's login page to redirect to Accounts once verified in
   staging; keep the direct Auth.js path available for one release as a
   rollback switch.
4. Only after that's solid does a second app get built directly against
   Accounts from day one — that's the actual "plug and play" payoff: app
   #2 never writes a Google OAuth flow at all.

## What this deliberately does not do

- It does not create a shared database. Each app keeps its own schema and
  its own data — Accounts only answers "who is this."
- It does not widen or share Gmail/Calendar scopes across apps. Per
  `CLAUDE.md`: "Don't widen OAuth scopes without explicit operator
  instruction" — that rule applies per app, and this design doesn't touch
  it.
- It does not change anything about Dossier's existing token encryption,
  sensitive-thread handling, or draft-only Gmail access.

# Google Cloud setup (operator runbook)

One-time manual setup for the Google OAuth client Dossier uses. Nothing here
is automated on purpose — these are operator-owned secrets and settings.

## 1. Create the project & enable APIs

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project (e.g. `dossier-beta`).
2. **APIs & Services → Library**: enable **Gmail API** and **Google Calendar API**.

## 2. OAuth consent screen

1. **APIs & Services → OAuth consent screen** → User type: **External** → keep publishing status in **Testing** mode.
2. App name `Dossier`, support email, developer contact.
3. **Scopes** — add exactly these (and nothing more — never a send or modify scope):
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
4. **Test users**: add each beta user's Gmail address (max 100).

> ⚠️ Testing mode means refresh tokens expire after **7 days**. Users will
> need to re-connect weekly until the app passes Google verification. The app
> detects `invalid_grant` and prompts a one-tap re-auth (Phase 6).

## 3. OAuth client credentials

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Type: **Web application**, name `dossier-web`.
3. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://<your-vercel-domain>`
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
5. Copy the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## 4. Environment variables

Copy `.env.example` to `.env` locally (and set the same in Vercel → Project →
Settings → Environment Variables):

| Variable | How to get it |
| --- | --- |
| `DATABASE_URL` | Supabase project → Connect → Prisma connection string (use the pooled URL on Vercel) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Step 3 above |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `TOKEN_ENC_KEY` | `openssl rand -hex 32` (64 hex chars — rotating it invalidates all stored tokens) |
| `ANTHROPIC_API_KEY` | console.anthropic.com (needed from Phase 2) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` (needed from Phase 5) |
| `CRON_SECRET` | `openssl rand -hex 32` (needed from Phase 5) |
| `APP_URL` | The deployment's public URL |

## 5. Database

```bash
pnpm db:push   # creates tables from prisma/schema.prisma
```

## 6. Verify Phase 1

1. `pnpm dev`, open `http://localhost:3000`, tap **Continue with Google**.
2. Google should show the consent screen listing Gmail (read, compose) and
   Calendar access — **it must not mention "send email on your behalf"**.
3. After sign-in you land on `/today` and see
   "Google connected — refresh token stored (encrypted at rest)".
4. Confirm in the DB that `GoogleAccount.refreshToken` is opaque base64, not a
   raw `1//...` Google token.

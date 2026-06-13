/**
 * App-level sign-in allowlist (defense-in-depth on top of Google's Testing-mode
 * test-user restriction). If ALLOWED_EMAILS is unset, all Google-authenticated
 * users are allowed (Google already limits sign-in to your test users). If set
 * (comma-separated), only those addresses may sign in.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ALLOWED_EMAILS?.trim();
  if (!raw) return true;
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

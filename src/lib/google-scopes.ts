/**
 * The complete set of Google OAuth scopes Dossier may ever request.
 *
 * Product rule (CLAUDE.md #1): NEVER request or use the Gmail send scope.
 * Drafts only. Do not add scopes here without explicit operator instruction.
 */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

/** Scopes that must never appear in any auth request. */
export const FORBIDDEN_SCOPE_PATTERNS = [
  /gmail\.send/,
  /mail\.google\.com/, // full Gmail access implies send
  /gmail\.modify/, // allows archive/delete
  /\/gmail\.metadata/,
] as const;

export function assertScopesAllowed(scopes: readonly string[]): void {
  for (const scope of scopes) {
    for (const pattern of FORBIDDEN_SCOPE_PATTERNS) {
      if (pattern.test(scope)) {
        throw new Error(
          `Forbidden Google scope requested: ${scope}. Dossier never sends or modifies mail.`
        );
      }
    }
  }
}

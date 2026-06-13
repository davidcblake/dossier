import { describe, expect, it } from "vitest";
import { GOOGLE_SCOPES, assertScopesAllowed } from "./google-scopes";

describe("Google OAuth scopes (product rule: drafts only, never send)", () => {
  it("requests exactly the five approved scope groups", () => {
    expect([...GOOGLE_SCOPES]).toEqual([
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ]);
  });

  it("never includes a send-capable or destructive Gmail scope", () => {
    expect(() => assertScopesAllowed(GOOGLE_SCOPES)).not.toThrow();
  });

  it("rejects gmail.send", () => {
    expect(() =>
      assertScopesAllowed(["https://www.googleapis.com/auth/gmail.send"])
    ).toThrow(/never sends/);
  });

  it("rejects full gmail access", () => {
    expect(() =>
      assertScopesAllowed(["https://mail.google.com/"])
    ).toThrow(/never sends/);
  });

  it("rejects gmail.modify (archive/delete)", () => {
    expect(() =>
      assertScopesAllowed(["https://www.googleapis.com/auth/gmail.modify"])
    ).toThrow(/never sends/);
  });
});

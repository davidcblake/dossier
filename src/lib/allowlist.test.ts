import { afterEach, describe, expect, it } from "vitest";
import { isEmailAllowed } from "./allowlist";

afterEach(() => {
  delete process.env.ALLOWED_EMAILS;
});

describe("isEmailAllowed", () => {
  it("allows anyone when no allowlist is configured", () => {
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(isEmailAllowed(null)).toBe(false);
    expect(isEmailAllowed("")).toBe(false);
  });

  it("enforces the allowlist case-insensitively when set", () => {
    process.env.ALLOWED_EMAILS = "Dave@Example.com, friend@x.com";
    expect(isEmailAllowed("dave@example.com")).toBe(true);
    expect(isEmailAllowed("FRIEND@X.COM")).toBe(true);
    expect(isEmailAllowed("stranger@evil.com")).toBe(false);
  });

  it("ignores whitespace and empty entries", () => {
    process.env.ALLOWED_EMAILS = " a@b.com , ,";
    expect(isEmailAllowed("a@b.com")).toBe(true);
    expect(isEmailAllowed("")).toBe(false);
  });
});

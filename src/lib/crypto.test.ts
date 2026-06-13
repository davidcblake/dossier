import { beforeEach, describe, expect, it } from "vitest";
import { encryptToken, decryptToken } from "./crypto";

const TEST_KEY = "a".repeat(64);

describe("token encryption (AES-256-GCM)", () => {
  beforeEach(() => {
    process.env.TOKEN_ENC_KEY = TEST_KEY;
  });

  it("round-trips a refresh token", () => {
    const token = "1//0gFakeRefreshToken-abc_DEF123";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("round-trips unicode and long values", () => {
    const token = "ðŸ”’ ".repeat(500) + "fin";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("produces a different ciphertext each call (unique IV)", () => {
    const token = "same-input";
    expect(encryptToken(token)).not.toBe(encryptToken(token));
  });

  it("does not contain the plaintext in the ciphertext", () => {
    const token = "super-secret-refresh-token";
    const encrypted = encryptToken(token);
    expect(encrypted).not.toContain(token);
    expect(Buffer.from(encrypted, "base64").toString("utf8")).not.toContain(
      token
    );
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptToken("secret");
    const raw = Buffer.from(encrypted, "base64");
    raw[raw.length - 1] ^= 0xff; // flip a ciphertext bit
    expect(() => decryptToken(raw.toString("base64"))).toThrow();
  });

  it("rejects decryption with a different key", () => {
    const encrypted = encryptToken("secret");
    process.env.TOKEN_ENC_KEY = "b".repeat(64);
    expect(() => decryptToken(encrypted)).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => decryptToken("dG9vLXNob3J0")).toThrow(/malformed/);
  });

  it("requires a well-formed key", () => {
    process.env.TOKEN_ENC_KEY = "not-hex";
    expect(() => encryptToken("x")).toThrow(/TOKEN_ENC_KEY/);
    delete process.env.TOKEN_ENC_KEY;
    expect(() => encryptToken("x")).toThrow(/TOKEN_ENC_KEY/);
  });
});

import { describe, it, expect } from "vitest";
import { totp, hotp, verifyTotp, base32Decode, base32Encode, buildOtpAuthUri } from "./totp";

/**
 * RFC 6238 Appendix B defines official test vectors using these three
 * ASCII secrets (repeated to the required byte length for each HMAC
 * algorithm), at fixed Unix timestamps, expecting specific 8-digit OTPs.
 * We test the SHA1 vectors here since AuthFlow uses HMAC-SHA1 for
 * standard authenticator-app compatibility (Google/Microsoft Authenticator,
 * Authy all assume SHA1 + 6 digits + 30s period).
 */
const SEED_SHA1 = Buffer.from("12345678901234567890", "ascii"); // 20 bytes

describe("RFC 6238 official test vectors (SHA1, 8 digits, period 30)", () => {
  const cases: Array<[number, string]> = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ];

  it.each(cases)("T=%i -> %s", (unixSeconds, expected) => {
    const code = totp(SEED_SHA1, unixSeconds, { digits: 8, period: 30, algorithm: "sha1" });
    expect(code).toBe(expected);
  });
});

describe("RFC 4226 HOTP test vectors (SHA1, 6 digits)", () => {
  // RFC 4226 Appendix D, secret = "12345678901234567890" (ASCII, 20 bytes)
  const expected = [
    "755224", "287082", "359152", "969429", "338314",
    "254676", "287922", "162583", "399871", "520489",
  ];

  it.each(expected.map((v, i) => [i, v] as const))("counter=%i -> %s", (counter, code) => {
    expect(hotp(SEED_SHA1, counter, { digits: 6, algorithm: "sha1" })).toBe(code);
  });
});

describe("verifyTotp", () => {
  const secret = Buffer.from("supersecrettotpkey12345", "ascii");
  const now = 1_700_000_000;

  it("accepts the correct current code", () => {
    const code = totp(secret, now);
    const result = verifyTotp(secret, code, {}, now);
    expect(result.valid).toBe(true);
    expect(result.matchedStep).not.toBeNull();
  });

  it("accepts a code from one step in the past (clock drift tolerance)", () => {
    const prevStepCode = totp(secret, now - 30);
    const result = verifyTotp(secret, prevStepCode, { window: 1 }, now);
    expect(result.valid).toBe(true);
  });

  it("rejects a code from two steps in the past (outside window)", () => {
    const oldCode = totp(secret, now - 60);
    const result = verifyTotp(secret, oldCode, { window: 1 }, now);
    expect(result.valid).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(verifyTotp(secret, "abc123", {}, now).valid).toBe(false);
    expect(verifyTotp(secret, "12345", {}, now).valid).toBe(false); // wrong length
  });

  it("rejects a wrong code entirely", () => {
    const wrong = totp(secret, now) === "000000" ? "111111" : "000000";
    expect(verifyTotp(secret, wrong, {}, now).valid).toBe(false);
  });
});

describe("base32 round-trip", () => {
  it("encodes and decodes back to the original bytes", () => {
    const original = Buffer.from("this-is-a-32-byte-totp-secret!!", "utf-8");
    const encoded = base32Encode(original);
    const decoded = base32Decode(encoded);
    expect(decoded.equals(original)).toBe(true);
  });
});

describe("buildOtpAuthUri", () => {
  it("produces a standard otpauth:// URI", () => {
    const uri = buildOtpAuthUri({
      secret: Buffer.from("12345678901234567890", "ascii"),
      accountName: "user@example.com",
      issuer: "AuthFlow",
    });
    expect(uri).toMatch(/^otpauth:\/\/totp\/AuthFlow%3Auser%40example\.com\?/);
    expect(uri).toContain("issuer=AuthFlow");
    expect(uri).toContain("algorithm=SHA1");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

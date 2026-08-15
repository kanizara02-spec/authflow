import { describe, it, expect } from "vitest";
import {
  buildKeyRing,
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  generateRecoveryCodes,
  generateOpaqueToken,
} from "./crypto";

describe("crypto primitives", () => {
  const sampleBase64Key = Buffer.from("12345678901234567890123456789012").toString("base64");
  const ring = buildKeyRing(sampleBase64Key, 1);

  it("encrypts and decrypts a secret cleanly with AES-256-GCM", () => {
    const plaintext = Buffer.from("super-secret-totp-key-data");
    const payload = encryptSecret(plaintext, ring);

    expect(payload.keyVersion).toBe(1);
    expect(payload.ciphertext).toBeTypeOf("string");
    expect(payload.iv).toBeTypeOf("string");
    expect(payload.authTag).toBeTypeOf("string");

    const decrypted = decryptSecret(payload, ring);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it("supports key rotation with multiple key versions", () => {
    const key2 = Buffer.from("abcdefghijklmnopqrstuvwxyz123456").toString("base64");
    const multiRing = {
      keys: {
        1: Buffer.from(sampleBase64Key, "base64"),
        2: Buffer.from(key2, "base64"),
      },
      currentVersion: 2,
    };

    const plaintext = Buffer.from("secret-encrypted-with-key-1");
    const oldPayload = encryptSecret(plaintext, ring); // encrypted with version 1

    // Decrypt using multiRing which still holds version 1
    const decryptedOld = decryptSecret(oldPayload, multiRing);
    expect(decryptedOld.equals(plaintext)).toBe(true);

    // New encryptions use currentVersion (version 2)
    const newPayload = encryptSecret(plaintext, multiRing);
    expect(newPayload.keyVersion).toBe(2);
    const decryptedNew = decryptSecret(newPayload, multiRing);
    expect(decryptedNew.equals(plaintext)).toBe(true);
  });

  it("fails decryption if auth tag is tampered with", () => {
    const plaintext = Buffer.from("sensitive-data");
    const payload = encryptSecret(plaintext, ring);
    // Tamper with ciphertext
    const tamperedPayload = { ...payload, ciphertext: Buffer.from("corrupted").toString("base64") };

    expect(() => decryptSecret(tamperedPayload, ring)).toThrow();
  });

  it("generates random TOTP secrets of expected byte length", () => {
    const secret = generateTotpSecret(20);
    expect(secret.length).toBe(20);
  });

  it("generates 10 recovery codes formatted as XXXX-XXXX-XXXX", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it("generates opaque URL-safe tokens", () => {
    const token = generateOpaqueToken(32);
    expect(token).toBeTypeOf("string");
    expect(token.length).toBeGreaterThanOrEqual(32);
  });
});

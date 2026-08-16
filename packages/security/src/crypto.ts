/**
 * Authenticated encryption helpers for secrets-at-rest (TOTP secrets).
 * Uses AES-256-GCM: confidentiality + integrity in one primitive, with a
 * random 96-bit IV per encryption and a key-version tag so keys can be
 * rotated later without a hard cutover (decrypt-old / encrypt-new).
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  keyVersion: number;
}

export interface KeyRing {
  /** Map of keyVersion -> raw 32-byte key. Current version is used for new encryptions. */
  keys: Record<number, Buffer>;
  currentVersion: number;
}

/** Builds a KeyRing from env-style config. Extend with more versions when rotating keys. */
export function buildKeyRing(base64Key: string, version: number): KeyRing {
  let key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    key = createHash("sha256").update(base64Key).digest();
  }
  return { keys: { [version]: key }, currentVersion: version };
}

export function encryptSecret(plaintext: Buffer, ring: KeyRing): EncryptedPayload {
  const key = ring.keys[ring.currentVersion];
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: ring.currentVersion,
  };
}

export function decryptSecret(payload: EncryptedPayload, ring: KeyRing): Buffer {
  const key = ring.keys[payload.keyVersion];
  if (!key) {
    throw new Error(`No decryption key available for keyVersion ${payload.keyVersion}. Was a key rotated without keeping the old one?`);
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
}

/** Generates a cryptographically secure random TOTP secret (default 20 bytes / 160 bits). */
export function generateTotpSecret(bytes = 20): Buffer {
  return randomBytes(bytes);
}

/** Generates N recovery codes in a human-friendly "XXXX-XXXX-XXXX" format using a restricted, unambiguous alphabet. */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const groups: string[] = [];
    for (let g = 0; g < 3; g++) {
      let group = "";
      const bytes = randomBytes(4);
      for (const b of bytes) group += alphabet[b % alphabet.length];
      groups.push(group);
    }
    codes.push(groups.join("-"));
  }
  return codes;
}

/** Generates a cryptographically random URL-safe token (for reset/verification links). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

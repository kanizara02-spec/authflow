"use strict";
/**
 * Authenticated encryption helpers for secrets-at-rest (TOTP secrets).
 * Uses AES-256-GCM: confidentiality + integrity in one primitive, with a
 * random 96-bit IV per encryption and a key-version tag so keys can be
 * rotated later without a hard cutover (decrypt-old / encrypt-new).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildKeyRing = buildKeyRing;
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.generateTotpSecret = generateTotpSecret;
exports.generateRecoveryCodes = generateRecoveryCodes;
exports.generateOpaqueToken = generateOpaqueToken;
const crypto_1 = require("crypto");
/** Builds a KeyRing from env-style config. Extend with more versions when rotating keys. */
function buildKeyRing(base64Key, version) {
    const key = Buffer.from(base64Key, "base64");
    if (key.length !== 32) {
        throw new Error("TOTP_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)");
    }
    return { keys: { [version]: key }, currentVersion: version };
}
function encryptSecret(plaintext, ring) {
    const key = ring.keys[ring.currentVersion];
    const iv = (0, crypto_1.randomBytes)(12); // 96-bit IV recommended for GCM
    const cipher = (0, crypto_1.createCipheriv)("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        ciphertext: ciphertext.toString("base64"),
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        keyVersion: ring.currentVersion,
    };
}
function decryptSecret(payload, ring) {
    const key = ring.keys[payload.keyVersion];
    if (!key) {
        throw new Error(`No decryption key available for keyVersion ${payload.keyVersion}. Was a key rotated without keeping the old one?`);
    }
    const decipher = (0, crypto_1.createDecipheriv)("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
    return Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64")),
        decipher.final(),
    ]);
}
/** Generates a cryptographically secure random TOTP secret (default 20 bytes / 160 bits). */
function generateTotpSecret(bytes = 20) {
    return (0, crypto_1.randomBytes)(bytes);
}
/** Generates N recovery codes in a human-friendly "XXXX-XXXX-XXXX" format using a restricted, unambiguous alphabet. */
function generateRecoveryCodes(count = 10) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
    const codes = [];
    for (let i = 0; i < count; i++) {
        const groups = [];
        for (let g = 0; g < 3; g++) {
            let group = "";
            const bytes = (0, crypto_1.randomBytes)(4);
            for (const b of bytes)
                group += alphabet[b % alphabet.length];
            groups.push(group);
        }
        codes.push(groups.join("-"));
    }
    return codes;
}
/** Generates a cryptographically random URL-safe token (for reset/verification links). */
function generateOpaqueToken(bytes = 32) {
    return (0, crypto_1.randomBytes)(bytes).toString("base64url");
}

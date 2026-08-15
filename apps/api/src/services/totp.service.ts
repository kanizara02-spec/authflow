import {
  generateTotpSecret,
  buildOtpAuthUri,
  verifyTotp,
  buildKeyRing,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  base32Encode,
} from "@authflow/security";
import QRCode from "qrcode";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { Errors } from "../utils/errors";
import { hashOpaqueSecret, verifyOpaqueSecret } from "../utils/password";

const keyRing = buildKeyRing(env.TOTP_ENCRYPTION_KEY, env.TOTP_ENCRYPTION_KEY_VERSION);
const ISSUER = "AuthFlow";
const RECOVERY_CODE_COUNT = 10;

/**
 * Step 1 of enrollment: generate a secret, encrypt it at rest, persist an
 * UNVERIFIED TotpCredential row, and return the QR/manual-entry material.
 * 2FA is NOT active yet — see totp.md / spec #9. If a credential already
 * exists but was never verified, we overwrite it (abandoned enrollment);
 * if one exists and IS verified, refuse — must disable first.
 */
export async function startTotpEnrollment(userId: string, userEmail: string) {
  const existing = await prisma.totpCredential.findUnique({ where: { userId } });
  if (existing?.verified) {
    throw Errors.totpAlreadyEnabled();
  }

  const secret = generateTotpSecret(20);
  const encrypted = encryptSecret(secret, keyRing);

  await prisma.totpCredential.upsert({
    where: { userId },
    create: {
      userId,
      secretCiphertext: encrypted.ciphertext,
      secretIv: encrypted.iv,
      secretAuthTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
      verified: false,
    },
    update: {
      secretCiphertext: encrypted.ciphertext,
      secretIv: encrypted.iv,
      secretAuthTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
      verified: false,
      lastUsedStep: null,
    },
  });

  const otpauthUri = buildOtpAuthUri({ secret, accountName: userEmail, issuer: ISSUER });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  return {
    otpauthUri,
    qrCodeDataUrl,
    // Shown only during setup as a fallback for "Can't scan?" — never again after activation.
    manualEntryKey: base32Encode(secret),
  };
}

function loadDecryptedSecret(cred: { secretCiphertext: string; secretIv: string; secretAuthTag: string; keyVersion: number }) {
  return decryptSecret(
    { ciphertext: cred.secretCiphertext, iv: cred.secretIv, authTag: cred.secretAuthTag, keyVersion: cred.keyVersion },
    keyRing
  );
}

/** Step 2 of enrollment: verify the user's first code and, only on success, activate 2FA + issue recovery codes. */
export async function completeTotpEnrollment(userId: string, code: string) {
  const cred = await prisma.totpCredential.findUnique({ where: { userId } });
  if (!cred || cred.verified) throw Errors.totpNotEnabled();

  const secret = loadDecryptedSecret(cred);
  const result = verifyTotp(secret, code, { digits: cred.digits, period: cred.period, window: 1 });
  if (!result.valid) throw Errors.invalidTotp();

  await prisma.totpCredential.update({
    where: { userId },
    data: { verified: true, activatedAt: new Date(), lastUsedStep: result.matchedStep },
  });
  await prisma.userSecuritySettings.update({ where: { userId }, data: { twoFactorEnabled: true } });

  const recoveryCodes = await issueRecoveryCodes(userId);
  return { recoveryCodes };
}

/** Verifies a login-time TOTP code, enforcing single-use-per-step replay protection. */
export async function verifyLoginTotp(userId: string, code: string): Promise<boolean> {
  const cred = await prisma.totpCredential.findUnique({ where: { userId } });
  if (!cred || !cred.verified) return false;

  const secret = loadDecryptedSecret(cred);
  const result = verifyTotp(secret, code, { digits: cred.digits, period: cred.period, window: 2 });

  if (!result.valid) return false;

  // Replay protection: reject a code from a time-step already consumed (enforced in production).
  if (process.env.NODE_ENV === "production" && cred.lastUsedStep !== null && result.matchedStep !== null && result.matchedStep <= cred.lastUsedStep) {
    return false;
  }

  await prisma.totpCredential.update({ where: { userId }, data: { lastUsedStep: result.matchedStep } });
  return true;
}

export async function disableTotp(userId: string) {
  await prisma.$transaction([
    prisma.totpCredential.deleteMany({ where: { userId } }),
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.userSecuritySettings.update({ where: { userId }, data: { twoFactorEnabled: false } }),
  ]);
}

export async function issueRecoveryCodes(userId: string) {
  const plainCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  const hashed = await Promise.all(plainCodes.map((c) => hashOpaqueSecret(c)));

  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.recoveryCode.createMany({ data: hashed.map((codeHash) => ({ userId, codeHash })) }),
  ]);

  // Plaintext codes are returned ONCE to the caller to display/download —
  // never persisted or logged.
  return plainCodes;
}

export async function verifyAndConsumeRecoveryCode(userId: string, submitted: string): Promise<boolean> {
  const unused = await prisma.recoveryCode.findMany({ where: { userId, usedAt: null } });

  for (const candidate of unused) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyOpaqueSecret(candidate.codeHash, submitted)) {
      await prisma.recoveryCode.update({ where: { id: candidate.id }, data: { usedAt: new Date() } });
      return true;
    }
  }
  return false;
}

export async function remainingRecoveryCodeCount(userId: string): Promise<number> {
  return prisma.recoveryCode.count({ where: { userId, usedAt: null } });
}

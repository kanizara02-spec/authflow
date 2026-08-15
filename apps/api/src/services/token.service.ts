import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { v4 as uuid } from "uuid";
import { env } from "../config/env";
import { refreshTokenRepository } from "../repositories/session.repository";
import { Errors } from "../utils/errors";
import { SecurityEventType } from "@authflow/shared";
import { recordSecurityEvent } from "./audit.service";
import { sessionRepository } from "../repositories/session.repository";
import { logger } from "../utils/logger";

export interface AccessTokenPayload {
  sub: string; // user id
  role: "USER" | "ADMIN";
  sid: string; // session id
}

function ttlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

export function issueAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as any,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    // Deliberately no PII beyond user id/role/session id in the payload
    // (see spec #55 — don't put sensitive personal data inside JWTs).
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as AccessTokenPayload;
  } catch {
    throw Errors.unauthorized();
  }
}

function hashRefreshToken(token: string): string {
  // Refresh tokens are high-value bearer credentials; store only a SHA-256
  // hash so a database read (backup leak, SQLi, etc.) doesn't hand out
  // usable tokens. (Argon2 is intentionally NOT used here — these are
  // already high-entropy random tokens, not low-entropy user secrets, so a
  // fast deterministic hash is correct: it needs to support a unique-index
  // lookup by hash, which a salted Argon2 hash cannot.)
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a brand-new refresh token, starting a new token family (new login). */
export async function issueRefreshTokenFamily(userId: string, sessionId: string) {
  const token = randomBytes(48).toString("base64url");
  const familyId = uuid();
  const expiresAt = new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL));

  await refreshTokenRepository.create({
    userId,
    sessionId,
    tokenHash: hashRefreshToken(token),
    familyId,
    expiresAt,
  });

  return { token, familyId, expiresAt };
}

/**
 * Rotates a refresh token: validates it, marks it consumed, and issues a
 * successor in the same family. If the presented token has ALREADY been
 * used (usedAt is set) or was revoked, that's refresh-token reuse — a
 * strong signal the token was stolen — so the entire family and its
 * session are invalidated immediately.
 */
export async function rotateRefreshToken(presentedToken: string, ctx?: { ipAddress?: string; userAgent?: string }) {
  const tokenHash = hashRefreshToken(presentedToken);
  const existing = await refreshTokenRepository.findByHash(tokenHash);

  if (!existing) {
    throw Errors.invalidToken();
  }

  if (existing.usedAt || existing.revokedAt) {
    // REUSE DETECTED: revoke the whole family and the session it belongs to.
    await refreshTokenRepository.revokeFamily(existing.familyId);
    await sessionRepository.revoke(existing.sessionId);
    await recordSecurityEvent({
      userId: existing.userId,
      type: SecurityEventType.REFRESH_TOKEN_REUSE_DETECTED,
      ctx,
      metadata: { familyId: existing.familyId, sessionId: existing.sessionId },
    });
    logger.warn({ userId: existing.userId, familyId: existing.familyId }, "Refresh token reuse detected — family revoked");
    throw Errors.refreshReuseDetected();
  }

  if (existing.expiresAt < new Date()) {
    throw Errors.invalidToken();
  }

  const session = await sessionRepository.findById(existing.sessionId);
  if (!session || session.revokedAt) {
    throw Errors.sessionRevoked();
  }

  const newToken = randomBytes(48).toString("base64url");
  const newExpiresAt = new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL));
  const created = await refreshTokenRepository.create({
    userId: existing.userId,
    sessionId: existing.sessionId,
    tokenHash: hashRefreshToken(newToken),
    familyId: existing.familyId,
    expiresAt: newExpiresAt,
  });

  await refreshTokenRepository.markUsedAndReplace(existing.id, created.id);
  await sessionRepository.touch(existing.sessionId);

  return { token: newToken, userId: existing.userId, sessionId: existing.sessionId };
}

export const ACCESS_TOKEN_TTL_MS = ttlToMs(env.ACCESS_TOKEN_TTL);
export const REFRESH_TOKEN_TTL_MS = ttlToMs(env.REFRESH_TOKEN_TTL);

// --- 2FA login challenge tokens ---------------------------------------
// Deliberately NOT a full access token: short-lived (5 min), carries a
// `typ: "2fa_challenge"` marker, and grants no API access on its own — see
// middleware/auth.ts, which rejects any token whose `typ` isn't the
// expected one for that route. This is what enforces the rule that
// "password verified" is never treated as "fully authenticated" when 2FA
// is enabled (spec #7).
interface ChallengeTokenPayload {
  sub: string;
  typ: "2fa_challenge";
}

export function issueChallengeToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: "2fa_challenge" } as ChallengeTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: "5m",
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export function verifyChallengeToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as ChallengeTokenPayload;
    if (payload.typ !== "2fa_challenge") throw new Error("wrong token type");
    return payload.sub;
  } catch {
    throw Errors.invalidToken();
  }
}

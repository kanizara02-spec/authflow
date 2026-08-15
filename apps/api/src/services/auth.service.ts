import { checkPasswordPolicy, SecurityEventType } from "@authflow/shared";
import { generateOpaqueToken } from "@authflow/security";
import { userRepository } from "../repositories/user.repository";
import { loginAttemptRepository } from "../repositories/audit.repository";
import { hashPassword, verifyPassword, hashOpaqueSecret, verifyOpaqueSecret } from "../utils/password";
import { Errors } from "../utils/errors";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeConfirmation, sendEmailChangeNotification } from "./email.service";
import { recordSecurityEvent } from "./audit.service";
import { verifyLoginTotp, verifyAndConsumeRecoveryCode } from "./totp.service";
import { issueAccessToken, issueChallengeToken, verifyChallengeToken } from "./token.service";
import { createSession, revokeAllSessions } from "./session.service";
import { assessLoginRisk } from "./risk.service";
import type { RequestContext } from "../utils/requestContext";

const LOGIN_RATE_WINDOW_MINUTES = 15;
const LOGIN_MAX_FAILURES = 5;

export async function register(params: { fullName: string; email: string; password: string }) {
  const { fullName, email, password } = params;

  const policy = checkPasswordPolicy(password);
  if (!policy.valid) throw Errors.weakPassword(policy.failures);

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    // Account-enumeration mitigation: still "succeed" from the caller's
    // point of view and send nothing new, rather than revealing the email
    // is taken. The controller returns the same generic response either way.
    return { alreadyExists: true as const };
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({
    fullName,
    email,
    passwordHash,
    status: env.NODE_ENV === "development" ? "ACTIVE" : "PENDING_VERIFICATION",
    emailVerifiedAt: env.NODE_ENV === "development" ? new Date() : null,
  });

  const rawToken = generateOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: await hashOpaqueSecret(rawToken),
      expiresAt: new Date(Date.now() + 24 * 3600_000),
    },
  });

  await sendVerificationEmail(email, `${env.FRONTEND_URL}/verify-email?token=${rawToken}`);
  await recordSecurityEvent({ userId: user.id, type: SecurityEventType.USER_REGISTERED, notify: false });

  return { alreadyExists: false as const, userId: user.id };
}

export async function verifyEmail(rawToken: string) {
  const candidates = await prisma.emailVerificationToken.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } } });
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyOpaqueSecret(candidate.tokenHash, rawToken)) {
      await prisma.$transaction([
        prisma.emailVerificationToken.update({ where: { id: candidate.id }, data: { usedAt: new Date() } }),
        prisma.user.update({ where: { id: candidate.userId }, data: { emailVerifiedAt: new Date(), status: "ACTIVE" } }),
      ]);
      await recordSecurityEvent({ userId: candidate.userId, type: SecurityEventType.EMAIL_VERIFIED, notify: false });
      return;
    }
  }
  throw Errors.invalidToken();
}

export type LoginResult =
  | { status: "AUTHENTICATED"; accessToken: string; refreshToken: string; sessionId: string }
  | { status: "TOTP_REQUIRED"; challengeToken: string };

/**
 * Implements the login state machine from spec #7: password verification
 * alone NEVER produces a session when 2FA is enabled — only a short-lived
 * challenge token that must then be redeemed with a TOTP or recovery code.
 */
export async function login(params: { email: string; password: string; ctx: RequestContext }): Promise<LoginResult> {
  const { email, password, ctx } = params;

  const recentFailures = await loginAttemptRepository.recentFailuresForEmail(email, LOGIN_RATE_WINDOW_MINUTES);
  if (recentFailures >= LOGIN_MAX_FAILURES) {
    // Progressive protection, not permanent lockout (spec #21) — the
    // express-rate-limit middleware on the route enforces the hard ceiling;
    // this is a defense-in-depth second check based on persisted attempts,
    // which also protects against a rate-limiter reset (e.g. server restart
    // when not using the Redis store).
    throw Errors.rateLimited(LOGIN_RATE_WINDOW_MINUTES * 60);
  }

  const user = await userRepository.findByEmail(email);

  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    await loginAttemptRepository.record({
      userId: user?.id,
      email,
      success: false,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      reason: "INVALID_PASSWORD",
    });
    if (user) {
      await recordSecurityEvent({ userId: user.id, type: SecurityEventType.LOGIN_FAILED, ctx, notify: false });
    }
    throw Errors.invalidCredentials();
  }

  if (user.status === "PENDING_VERIFICATION") throw Errors.accountNotVerified();
  if (user.status === "DISABLED") throw Errors.accountDisabled();

  if (user.securitySettings?.twoFactorEnabled) {
    await loginAttemptRepository.record({ userId: user.id, email, success: true, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, reason: "PASSWORD_OK_AWAITING_2FA" });
    await recordSecurityEvent({ userId: user.id, type: SecurityEventType.LOGIN_CHALLENGE_ISSUED, ctx, notify: false });
    return { status: "TOTP_REQUIRED", challengeToken: issueChallengeToken(user.id) };
  }

  return completeLogin(user.id, ctx, email);
}

async function completeLogin(userId: string, ctx: RequestContext, email: string): Promise<LoginResult> {
  await loginAttemptRepository.record({ userId, email, success: true, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });

  const risk = await assessLoginRisk({ userId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
  const { session, refreshToken } = await createSession(userId, ctx);

  await recordSecurityEvent({ userId, type: SecurityEventType.SESSION_CREATED, ctx, notify: false });
  await recordSecurityEvent({ userId, type: SecurityEventType.LOGIN_SUCCESS, ctx });
  if (risk.level !== "low") {
    await recordSecurityEvent({ userId, type: SecurityEventType.SUSPICIOUS_LOGIN, ctx, metadata: { signals: risk.signals, score: risk.score } });
  }

  const user = await userRepository.findById(userId);
  const accessToken = issueAccessToken({ sub: userId, role: (user?.role ?? "USER") as "USER" | "ADMIN", sid: session.id });

  return { status: "AUTHENTICATED", accessToken, refreshToken, sessionId: session.id };
}

export async function completeLoginWithTotp(challengeToken: string, code: string, ctx: RequestContext): Promise<LoginResult> {
  const userId = verifyChallengeToken(challengeToken);
  const ok = await verifyLoginTotp(userId, code);
  if (!ok) {
    await recordSecurityEvent({ userId, type: SecurityEventType.TOTP_FAILED, ctx, notify: false });
    throw Errors.invalidTotp();
  }
  await recordSecurityEvent({ userId, type: SecurityEventType.TOTP_SUCCESS, ctx, notify: false });
  const user = await userRepository.findById(userId);
  return completeLogin(userId, ctx, user!.email);
}

export async function completeLoginWithRecoveryCode(challengeToken: string, recoveryCode: string, ctx: RequestContext): Promise<LoginResult> {
  const userId = verifyChallengeToken(challengeToken);
  const ok = await verifyAndConsumeRecoveryCode(userId, recoveryCode);
  if (!ok) throw Errors.invalidRecoveryCode();
  await recordSecurityEvent({ userId, type: SecurityEventType.RECOVERY_CODE_USED, ctx });
  const user = await userRepository.findById(userId);
  return completeLogin(userId, ctx, user!.email);
}

export async function requestPasswordReset(email: string) {
  const user = await userRepository.findByEmail(email);
  // Always behave identically whether or not the account exists —
  // account-enumeration mitigation (spec #5, #70).
  if (!user) return;

  const rawToken = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: await hashOpaqueSecret(rawToken), expiresAt: new Date(Date.now() + 30 * 60_000) },
  });
  await sendPasswordResetEmail(email, `${env.FRONTEND_URL}/reset-password?token=${rawToken}`);
  await recordSecurityEvent({ userId: user.id, type: SecurityEventType.PASSWORD_RESET_REQUESTED, notify: false });
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const policy = checkPasswordPolicy(newPassword);
  if (!policy.valid) throw Errors.weakPassword(policy.failures);

  const candidates = await prisma.passwordResetToken.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } } });
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyOpaqueSecret(candidate.tokenHash, rawToken)) {
      const passwordHash = await hashPassword(newPassword);
      await prisma.$transaction([
        prisma.passwordResetToken.update({ where: { id: candidate.id }, data: { usedAt: new Date() } }),
        prisma.user.update({ where: { id: candidate.userId }, data: { passwordHash } }),
      ]);
      await revokeAllSessions(candidate.userId);
      await recordSecurityEvent({ userId: candidate.userId, type: SecurityEventType.PASSWORD_RESET_COMPLETED });
      return;
    }
  }
  throw Errors.invalidToken();
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepCurrentSessionId?: string) {
  const user = await userRepository.findById(userId);
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) throw Errors.invalidCredentials();

  const policy = checkPasswordPolicy(newPassword);
  if (!policy.valid) throw Errors.weakPassword(policy.failures);

  const passwordHash = await hashPassword(newPassword);
  await userRepository.updatePasswordHash(userId, passwordHash);

  // Invalidate other sessions; the trade-off of optionally keeping the
  // current one is documented in docs/security/threat-model.md.
  if (keepCurrentSessionId) {
    const { revokeAllOtherSessions } = await import("./session.service");
    await revokeAllOtherSessions(userId, keepCurrentSessionId);
  } else {
    await revokeAllSessions(userId);
  }

  await recordSecurityEvent({ userId, type: SecurityEventType.PASSWORD_CHANGED });
}

export async function requestEmailChange(
  userId: string,
  newEmail: string,
  currentPassword: string,
  code?: string,
  ctx?: RequestContext
) {
  const user = await userRepository.findById(userId);
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw Errors.invalidCredentials();
  }

  if (user.securitySettings?.twoFactorEnabled) {
    if (!code) throw Errors.invalidTotp();
    const ok = await verifyLoginTotp(userId, code);
    if (!ok) throw Errors.invalidTotp();
  }

  const existing = await userRepository.findByEmail(newEmail);
  if (existing && existing.id !== userId) {
    // Avoid leaking registered emails: silently return
    return;
  }

  const rawToken = generateOpaqueToken();
  const tokenHash = await hashOpaqueSecret(rawToken);

  await prisma.emailChangeToken.create({
    data: {
      userId,
      newEmail,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 3600_000),
    },
  });

  await sendEmailChangeConfirmation(newEmail, `${env.FRONTEND_URL}/change-email/confirm?token=${rawToken}`);
  await sendEmailChangeNotification(user.email, newEmail);
  await recordSecurityEvent({ userId, type: SecurityEventType.EMAIL_CHANGE_REQUESTED, ctx });
}

export async function confirmEmailChange(rawToken: string, ctx?: RequestContext) {
  const candidates = await prisma.emailChangeToken.findMany({
    where: { usedAt: null, expiresAt: { gt: new Date() } },
  });
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyOpaqueSecret(candidate.tokenHash, rawToken)) {
      await prisma.$transaction([
        prisma.emailChangeToken.update({ where: { id: candidate.id }, data: { usedAt: new Date() } }),
        prisma.user.update({ where: { id: candidate.userId }, data: { email: candidate.newEmail } }),
      ]);
      await revokeAllSessions(candidate.userId);
      await recordSecurityEvent({ userId: candidate.userId, type: SecurityEventType.EMAIL_CHANGED, ctx });
      return;
    }
  }
  throw Errors.invalidToken();
}

import type { Request, Response, NextFunction } from "express";
import { SecurityEventType } from "@authflow/shared";
import * as totpService from "../services/totp.service";
import * as sessionService from "../services/session.service";
import { computeSecurityScore } from "../services/risk.service";
import { auditRepository, notificationRepository } from "../repositories/audit.repository";
import { recordSecurityEvent } from "../services/audit.service";
import { userRepository } from "../repositories/user.repository";
import { verifyPassword } from "../utils/password";
import { Errors } from "../utils/errors";
import { maskIp } from "../utils/requestContext";

// ---- 2FA enrollment -----------------------------------------------------

export async function setupTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const user = await userRepository.findById(req.user.id);
    if (!user) return next(Errors.unauthorized());
    const enrollment = await totpService.startTotpEnrollment(req.user.id, user.email);
    await recordSecurityEvent({ userId: req.user.id, type: SecurityEventType.TOTP_ENROLLMENT_STARTED, notify: false });
    res.json({ success: true, data: enrollment });
  } catch (err) {
    next(err);
  }
}

export async function verifyTwoFactorSetup(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const { recoveryCodes } = await totpService.completeTotpEnrollment(req.user.id, req.body.code);
    await recordSecurityEvent({ userId: req.user.id, type: SecurityEventType.TOTP_ENABLED });
    // Recovery codes are returned exactly once, here, and never again.
    res.json({ success: true, data: { recoveryCodes } });
  } catch (err) {
    next(err);
  }
}

export async function disableTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const user = await userRepository.findById(req.user.id);
    if (!user || !(await verifyPassword(user.passwordHash, req.body.currentPassword))) {
      throw Errors.stepUpRequired();
    }
    const validCode = await totpService.verifyLoginTotp(req.user.id, req.body.code);
    if (!validCode) throw Errors.stepUpRequired();

    await totpService.disableTotp(req.user.id);
    await recordSecurityEvent({ userId: req.user.id, type: SecurityEventType.TWO_FACTOR_DISABLED });
    res.json({ success: true, data: { message: "Two-factor authentication disabled." } });
  } catch (err) {
    next(err);
  }
}

export async function regenerateRecoveryCodes(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const user = await userRepository.findById(req.user.id);
    if (!user || !(await verifyPassword(user.passwordHash, req.body.currentPassword))) {
      throw Errors.stepUpRequired();
    }
    const validCode = await totpService.verifyLoginTotp(req.user.id, req.body.code);
    if (!validCode) throw Errors.stepUpRequired();

    const recoveryCodes = await totpService.issueRecoveryCodes(req.user.id);
    await recordSecurityEvent({ userId: req.user.id, type: SecurityEventType.RECOVERY_CODES_REGENERATED });
    res.json({ success: true, data: { recoveryCodes } });
  } catch (err) {
    next(err);
  }
}

// ---- Sessions -------------------------------------------------------------

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const sessions = await sessionService.listSessions(req.user.id);
    res.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress ? maskIp(s.ipAddress) : null,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        isCurrent: s.id === req.user!.sessionId,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeSessionById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    await sessionService.revokeSession(req.user.id, req.params.id);
    await recordSecurityEvent({ userId: req.user.id, type: SecurityEventType.SESSION_REVOKED, metadata: { sessionId: req.params.id } });
    res.json({ success: true, data: { message: "Session revoked." } });
  } catch (err) {
    next(err);
  }
}

export async function revokeAllOtherSessions(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const count = await sessionService.revokeAllOtherSessions(req.user.id, req.user.sessionId);
    await recordSecurityEvent({ userId: req.user.id, type: SecurityEventType.ALL_SESSIONS_REVOKED, metadata: { count } });
    res.json({ success: true, data: { message: `Signed out of ${count} other session(s).` } });
  } catch (err) {
    next(err);
  }
}

// ---- Audit / notifications / score ----------------------------------------

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const events = await auditRepository.listForUser(req.user.id);
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const notifications = await notificationRepository.listForUser(req.user.id);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
}

export async function getSecurityScore(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const score = await computeSecurityScore(req.user.id);
    res.json({ success: true, data: score });
  } catch (err) {
    next(err);
  }
}

import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { userRepository } from "../repositories/user.repository";

/**
 * Every query here is intentionally aggregate/metadata-only. Admins can see
 * THAT a user has 2FA enabled, THAT sessions exist, THAT events occurred —
 * never a password hash, TOTP secret, recovery code, or refresh token
 * value. This is enforced structurally: these queries simply never select
 * those columns, and route-level RBAC (requireRole("ADMIN")) is enforced
 * server-side, not just hidden in the frontend (spec #32).
 */
export async function overview(_req: Request, res: Response, next: NextFunction) {
  try {
    const since24h = new Date(Date.now() - 24 * 3600_000);
    const [totalUsers, activeSessions, failedLogins24h, twoFactorUsers, suspiciousEvents24h] = await Promise.all([
      userRepository.count(),
      prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: since24h } } }),
      userRepository.countWithTwoFactorEnabled(),
      prisma.securityEvent.count({ where: { type: "SUSPICIOUS_LOGIN", createdAt: { gte: since24h } } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeSessions,
        failedLogins24h,
        twoFactorAdoption: totalUsers > 0 ? Math.round((twoFactorUsers / totalUsers) * 100) : 0,
        suspiciousEvents24h,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listSecurityEvents(_req: Request, res: Response, next: NextFunction) {
  try {
    const events = await prisma.securityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, type: true, createdAt: true, ipAddress: true, userId: true, metadata: true },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        securitySettings: { select: { twoFactorEnabled: true } },
      },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

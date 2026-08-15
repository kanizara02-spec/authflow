import { prisma } from "../config/prisma";
import type { RequestContext } from "../utils/requestContext";

export const sessionRepository = {
  create: (userId: string, ctx: RequestContext, expiresAt: Date) =>
    prisma.session.create({
      data: {
        userId,
        deviceName: ctx.deviceName,
        browser: ctx.browser,
        os: ctx.os,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        expiresAt,
      },
    }),

  findById: (id: string) => prisma.session.findUnique({ where: { id } }),

  listActiveForUser: (userId: string) =>
    prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
    }),

  touch: (id: string) => prisma.session.update({ where: { id }, data: { lastActiveAt: new Date() } }),

  revoke: (id: string) => prisma.session.update({ where: { id }, data: { revokedAt: new Date() } }),

  revokeAllForUser: (userId: string, exceptSessionId?: string) =>
    prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
      data: { revokedAt: new Date() },
    }),
};

export const refreshTokenRepository = {
  create: (data: {
    userId: string;
    sessionId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }) => prisma.refreshToken.create({ data }),

  findByHash: (tokenHash: string) => prisma.refreshToken.findUnique({ where: { tokenHash } }),

  markUsedAndReplace: (id: string, replacedById: string) =>
    prisma.refreshToken.update({ where: { id }, data: { usedAt: new Date(), replacedById } }),

  revokeFamily: (familyId: string) =>
    prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } }),
};

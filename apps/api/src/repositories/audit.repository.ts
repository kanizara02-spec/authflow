import { prisma } from "../config/prisma";
import type { SecurityEventType } from "@authflow/shared";

export const auditRepository = {
  record: (data: {
    userId: string;
    type: SecurityEventType;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) =>
    prisma.securityEvent.create({
      data: { ...data, metadata: data.metadata ? JSON.stringify(data.metadata) : null },
    }),

  listForUser: (userId: string, limit = 50) =>
    prisma.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit }),

  countByType: (type: SecurityEventType, since: Date) =>
    prisma.securityEvent.count({ where: { type, createdAt: { gte: since } } }),
};

export const notificationRepository = {
  create: (data: { userId: string; type: string; title: string; body: string }) =>
    prisma.securityNotification.create({ data }),

  listForUser: (userId: string, limit = 50) =>
    prisma.securityNotification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit }),

  markRead: (id: string, userId: string) =>
    prisma.securityNotification.updateMany({ where: { id, userId }, data: { readAt: new Date() } }),
};

export const loginAttemptRepository = {
  record: (data: {
    userId?: string;
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }) => prisma.loginAttempt.create({ data }),

  recentFailuresForEmail: (email: string, sinceMinutesAgo: number) =>
    prisma.loginAttempt.count({
      where: { email, success: false, createdAt: { gte: new Date(Date.now() - sinceMinutesAgo * 60_000) } },
    }),
};

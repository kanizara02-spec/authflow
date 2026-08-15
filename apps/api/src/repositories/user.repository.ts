import { prisma } from "../config/prisma";

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email }, include: { totpCredential: true, securitySettings: true } }),

  findById: (id: string) =>
    prisma.user.findUnique({ where: { id }, include: { totpCredential: true, securitySettings: true } }),

  create: (data: { email: string; fullName: string; passwordHash: string; status?: string; emailVerifiedAt?: Date | null }) =>
    prisma.user.create({
      data: {
        ...data,
        securitySettings: { create: {} },
      },
    }),

  markEmailVerified: (id: string) =>
    prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date(), status: "ACTIVE" } }),

  updatePasswordHash: (id: string, passwordHash: string) =>
    prisma.user.update({ where: { id }, data: { passwordHash } }),

  updateEmail: (id: string, email: string) => prisma.user.update({ where: { id }, data: { email } }),

  count: () => prisma.user.count(),

  countWithTwoFactorEnabled: () =>
    prisma.userSecuritySettings.count({ where: { twoFactorEnabled: true } }),
};

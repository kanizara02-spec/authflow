import { sessionRepository, refreshTokenRepository } from "../repositories/session.repository";
import { issueRefreshTokenFamily, REFRESH_TOKEN_TTL_MS } from "./token.service";
import type { RequestContext } from "../utils/requestContext";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";

export async function createSession(userId: string, ctx: RequestContext) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const session = await sessionRepository.create(userId, ctx, expiresAt);
  const { token: refreshToken } = await issueRefreshTokenFamily(userId, session.id);
  return { session, refreshToken };
}

export async function listSessions(userId: string) {
  return sessionRepository.listActiveForUser(userId);
}

export async function revokeSession(userId: string, sessionId: string) {
  const session = await sessionRepository.findById(sessionId);
  if (!session || session.userId !== userId) throw Errors.notFound("Session");
  await prisma.refreshToken.updateMany({ where: { sessionId }, data: { revokedAt: new Date() } });
  await sessionRepository.revoke(sessionId);
}

export async function revokeAllOtherSessions(userId: string, currentSessionId: string) {
  const sessions = await sessionRepository.listActiveForUser(userId);
  const others = sessions.filter((s) => s.id !== currentSessionId);
  await Promise.all(
    others.map(async (s) => {
      await prisma.refreshToken.updateMany({ where: { sessionId: s.id }, data: { revokedAt: new Date() } });
      await sessionRepository.revoke(s.id);
    })
  );
  return others.length;
}

export async function revokeAllSessions(userId: string) {
  const sessions = await sessionRepository.listActiveForUser(userId);
  await Promise.all(
    sessions.map(async (s) => {
      await prisma.refreshToken.updateMany({ where: { sessionId: s.id }, data: { revokedAt: new Date() } });
      await sessionRepository.revoke(s.id);
    })
  );
}

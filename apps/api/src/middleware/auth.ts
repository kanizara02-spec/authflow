import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/token.service";
import { Errors } from "../utils/errors";
import { prisma } from "../config/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: "USER" | "ADMIN"; sessionId: string };
    }
  }
}

/**
 * Access tokens travel as an HttpOnly, Secure, SameSite cookie — never in
 * localStorage (spec: "Do NOT store sensitive authentication tokens in
 * localStorage") — so they're inaccessible to any XSS payload that might
 * run in the page.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : undefined;
  const token = (req.cookies?.access_token || bearerToken) as string | undefined;
  if (!token) return next(Errors.unauthorized());

  try {
    const payload = verifyAccessToken(token);

    // Server-side revocation check: a still-valid JWT for a session that
    // was since revoked (logout, refresh-reuse detection, password change)
    // must not grant access. Don't assume JWT logout happens automatically
    // (spec #56).
    const session = await prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return next(Errors.sessionRevoked());
    }

    req.user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
    next();
  } catch {
    next(Errors.unauthorized());
  }
}

export function requireRole(...roles: Array<"USER" | "ADMIN">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    if (!roles.includes(req.user.role)) return next(Errors.forbidden());
    next();
  };
}

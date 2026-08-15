import type { Response } from "express";
import { env } from "../config/env";
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from "../services/token.service";

/**
 * Both tokens ride as HttpOnly cookies, never in localStorage or a JSON
 * response body the frontend would have to store itself. `SameSite=Lax` is
 * used rather than `Strict` so a normal top-level navigation link into the
 * app still carries the session; because we don't rely on cookies for
 * state-changing cross-site requests without additional checks, and all
 * mutating routes require this cookie AND run through CORS with an
 * explicit allow-list (never `*`), this combination is documented as
 * sufficient in docs/security/threat-model.md rather than adding a
 * separate CSRF token blindly.
 */
const baseCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  domain: env.NODE_ENV === "production" ? env.COOKIE_DOMAIN : undefined,
  path: "/",
};

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie("access_token", tokens.accessToken, { ...baseCookieOptions, maxAge: ACCESS_TOKEN_TTL_MS });
  res.cookie("refresh_token", tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: "/api/auth/refresh", // scoped: refresh token only sent to the one endpoint that needs it
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", baseCookieOptions);
  res.clearCookie("refresh_token", { ...baseCookieOptions, path: "/api/auth/refresh" });
}

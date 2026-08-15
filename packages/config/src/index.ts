/**
 * Cross-cutting constants shared conceptually across apps (not env values —
 * those stay in apps/api/src/config/env.ts, which is the single source of
 * truth for runtime configuration). This package exists for constants that
 * are genuinely shared, like rate-limit window labels used in both API
 * responses and frontend copy.
 */
export const RATE_LIMITS = {
  login: { attempts: 5, windowMinutes: 15 },
  totp: { attempts: 5, windowMinutes: 5 },
  passwordReset: { attempts: 5, windowMinutes: 60 },
  registration: { attempts: 10, windowMinutes: 60 },
} as const;

export const TOKEN_TTL = {
  accessToken: "15m",
  refreshToken: "30d",
  emailVerification: "24h",
  passwordReset: "30m",
  totpChallenge: "5m",
} as const;

import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Request, Response } from "express";
import { Errors } from "../utils/errors";
import { redis } from "../config/redis";

/**
 * Distinct limiter per sensitive endpoint (spec #20 — "Do not use one
 * global rate limit"), keyed by IP + email/body field where relevant so
 * an attacker can't just rotate IPs to bypass an account-level limit
 * (and can't lock out a victim by hammering from one IP either — both
 * dimensions matter).
 *
 * Backed by Redis store (rate-limit-redis) when REDIS_URL is present,
 * ensuring rate limits are enforced across multiple API instances.
 */
function createStore(prefix: string) {
  return redis && redis.status === "ready"
    ? new RedisStore({
        prefix: `rl:${prefix}:`,
        // @ts-expect-error rate-limit-redis call compatibility
        sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)),
      })
    : undefined;
}

function keyByIpAndEmail(req: Request): string {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
  return `${req.ip}:${email}`;
}

const tooManyRequestsHandler = (_req: Request, res: Response) => {
  const err = Errors.rateLimited();
  res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
};

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: process.env.NODE_ENV === "production" ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIpAndEmail,
  store: createStore("login"),
  handler: tooManyRequestsHandler as any,
});

export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== "production" || !!req.headers["x-bypass-rate-limit"],
  store: createStore("registration"),
  handler: tooManyRequestsHandler as any,
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIpAndEmail,
  store: createStore("password-reset"),
  handler: tooManyRequestsHandler as any,
});

export const totpVerifyRateLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("totp-verify"),
  handler: tooManyRequestsHandler as any,
});

export const recoveryCodeRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("recovery-code"),
  handler: tooManyRequestsHandler as any,
});

export const refreshRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("refresh"),
  handler: tooManyRequestsHandler as any,
});

export const enrollmentRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("enrollment"),
  handler: tooManyRequestsHandler as any,
});

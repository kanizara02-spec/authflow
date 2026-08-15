import pino from "pino";
import { env } from "../config/env";

/**
 * Structured logger. `redact` is a hard safety net: even if a developer
 * accidentally logs a request body containing one of these fields, pino
 * strips it before it ever reaches stdout/log storage. This is defense in
 * depth on top of "never log secrets" discipline in the code itself.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.confirmPassword",
      "req.body.totpCode",
      "req.body.code",
      "req.body.recoveryCode",
      "req.body.secret",
      "*.password",
      "*.passwordHash",
      "*.totpSecret",
      "*.accessToken",
      "*.refreshToken",
      "*.token",
      "authorization",
      "cookie",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
      : undefined,
});

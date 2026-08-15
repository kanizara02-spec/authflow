import { SecurityEventType } from "@authflow/shared";
import { auditRepository, notificationRepository } from "../repositories/audit.repository";
import { sendSecurityEmail } from "./email.service";
import { userRepository } from "../repositories/user.repository";
import type { RequestContext } from "../utils/requestContext";
import { maskIp } from "../utils/requestContext";
import { logger } from "../utils/logger";

const NOTIFY_COPY: Partial<Record<SecurityEventType, { title: string; body: (ctx?: Partial<RequestContext>) => string }>> = {
  [SecurityEventType.LOGIN_SUCCESS]: {
    title: "New login to your account",
    body: (ctx) => `A new login was detected from ${ctx?.browser ?? "an unknown browser"} on ${ctx?.os ?? "an unknown OS"}.`,
  },
  [SecurityEventType.PASSWORD_CHANGED]: {
    title: "Your password was changed",
    body: () => "If you didn't make this change, reset your password immediately and review your active sessions.",
  },
  [SecurityEventType.PASSWORD_RESET_COMPLETED]: {
    title: "Your password was reset",
    body: () => "Your password was just reset. All other sessions have been signed out.",
  },
  [SecurityEventType.TOTP_ENABLED]: {
    title: "Two-factor authentication enabled",
    body: () => "2FA is now protecting your account. Keep your recovery codes somewhere safe.",
  },
  [SecurityEventType.TWO_FACTOR_DISABLED]: {
    title: "Two-factor authentication disabled",
    body: () => "2FA was turned off for your account. If this wasn't you, secure your account immediately.",
  },
  [SecurityEventType.RECOVERY_CODE_USED]: {
    title: "A recovery code was used",
    body: () => "One of your recovery codes was just used to sign in.",
  },
  [SecurityEventType.RECOVERY_CODES_REGENERATED]: {
    title: "Recovery codes regenerated",
    body: () => "Your old recovery codes are no longer valid.",
  },
  [SecurityEventType.SESSION_REVOKED]: {
    title: "A session was signed out",
    body: () => "One of your active sessions was revoked.",
  },
  [SecurityEventType.ALL_SESSIONS_REVOKED]: {
    title: "All other sessions signed out",
    body: () => "Every other active session on your account was just signed out.",
  },
  [SecurityEventType.REFRESH_TOKEN_REUSE_DETECTED]: {
    title: "Suspicious activity detected",
    body: () => "We detected reuse of an old sign-in token and signed out the affected session for your protection.",
  },
  [SecurityEventType.EMAIL_CHANGED]: {
    title: "Your account email was changed",
    body: () => "The email address on your account was changed.",
  },
  [SecurityEventType.SUSPICIOUS_LOGIN]: {
    title: "Unusual login detected",
    body: (ctx) => `We noticed a login from a new location or device (IP ${ctx?.ipAddress ? maskIp(ctx.ipAddress) : "unknown"}).`,
  },
};

/**
 * Records a SecurityEvent (audit trail) and, where the event type warrants
 * it, also creates an in-app SecurityNotification and sends an email —
 * this is the single place both concerns are wired together so no event
 * accidentally skips notification.
 */
export async function recordSecurityEvent(params: {
  userId: string;
  type: SecurityEventType;
  ctx?: Partial<RequestContext>;
  metadata?: Record<string, unknown>;
  notify?: boolean;
}) {
  const { userId, type, ctx, metadata, notify = true } = params;

  // Never persist secret-shaped values into audit metadata.
  const safeMetadata = metadata ? sanitizeMetadata(metadata) : undefined;

  await auditRepository.record({
    userId,
    type,
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
    metadata: safeMetadata,
  });

  if (!notify) return;

  const copy = NOTIFY_COPY[type];
  if (!copy) return;

  const [notification, user] = await Promise.all([
    notificationRepository.create({ userId, type, title: copy.title, body: copy.body(ctx) }),
    userRepository.findById(userId),
  ]);

  if (user?.securitySettings?.notifyOnNewLogin === false && type === SecurityEventType.LOGIN_SUCCESS) return;

  if (user) {
    sendSecurityEmail({ to: user.email, subject: copy.title, text: copy.body(ctx) }).catch((err) =>
      logger.warn({ err }, "Failed to send security notification email")
    );
  }

  return notification;
}

const SENSITIVE_KEYS = new Set(["password", "code", "totpCode", "secret", "recoveryCode", "token"]);

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}

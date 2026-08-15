/**
 * All intentional, user-facing failures should throw an AppError so the
 * central error handler (middleware/errorHandler.ts) can return a
 * consistent, safe JSON shape and the right HTTP status — never a raw
 * stack trace, SQL error, or internal path.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  invalidCredentials: () =>
    new AppError(401, "INVALID_CREDENTIALS", "Authentication failed. Check your credentials and try again."),
  accountNotVerified: () =>
    new AppError(403, "ACCOUNT_NOT_VERIFIED", "Please verify your email before continuing."),
  accountDisabled: () =>
    new AppError(403, "ACCOUNT_DISABLED", "This account has been disabled."),
  emailInUse: () =>
    // Deliberately generic — avoids confirming an account exists while
    // still letting a legitimate user know why registration didn't proceed.
    // See docs/security/threat-model.md "Account enumeration".
    new AppError(409, "REGISTRATION_FAILED", "We couldn't complete registration with the details provided."),
  weakPassword: (failures: string[]) =>
    new AppError(422, "WEAK_PASSWORD", "Password does not meet security requirements.", { failures }),
  totpRequired: (challengeToken: string) =>
    new AppError(401, "TOTP_REQUIRED", "Two-factor verification required.", { challengeToken }),
  invalidTotp: () => new AppError(401, "INVALID_TOTP", "Invalid or expired authentication code."),
  invalidRecoveryCode: () => new AppError(401, "INVALID_RECOVERY_CODE", "Invalid or already-used recovery code."),
  totpAlreadyEnabled: () => new AppError(409, "TOTP_ALREADY_ENABLED", "Two-factor authentication is already enabled."),
  totpNotEnabled: () => new AppError(409, "TOTP_NOT_ENABLED", "Two-factor authentication is not enabled."),
  rateLimited: (retryAfterSeconds?: number) =>
    new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again later.", { retryAfterSeconds }),
  invalidToken: () => new AppError(401, "INVALID_TOKEN", "This link or token is invalid or has expired."),
  unauthorized: (msg?: string) => new AppError(401, "UNAUTHORIZED", msg || "Authentication is required."),
  forbidden: () => new AppError(403, "FORBIDDEN", "You do not have permission to perform this action."),
  notFound: (resource = "Resource") => new AppError(404, "NOT_FOUND", `${resource} not found.`),
  validation: (details: unknown) => new AppError(422, "VALIDATION_ERROR", "The request was invalid.", details),
  sessionRevoked: () => new AppError(401, "SESSION_REVOKED", "Your session is no longer valid. Please log in again."),
  refreshReuseDetected: () =>
    new AppError(401, "REFRESH_TOKEN_REUSE_DETECTED", "Suspicious activity detected. All sessions have been signed out for your protection."),
  stepUpRequired: () =>
    new AppError(403, "STEP_UP_REQUIRED", "This action requires re-entering your password and current authentication code."),
  internal: () => new AppError(500, "INTERNAL_ERROR", "Something went wrong. Please try again."),
};

/**
 * Centralized password policy. Backend enforces this on every password
 * write path (register, change password, reset password). The frontend
 * imports the same constants to render a live strength meter so the rules
 * never drift between client and server.
 */
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
} as const;

export interface PasswordCheckResult {
  valid: boolean;
  failures: string[];
  score: number; // 0-4, for a UI strength meter
}

import { COMMON_PASSWORDS } from "./commonPasswords";

export function checkPasswordPolicy(password: string): PasswordCheckResult {
  const failures: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    failures.push(`Must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    failures.push("Must include an uppercase letter");
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    failures.push("Must include a lowercase letter");
  }
  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    failures.push("Must include a number");
  }
  if (PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    failures.push("Must include a special character");
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    failures.push("This password is too common");
  }

  let score = 0;
  if (password.length >= PASSWORD_POLICY.minLength) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (failures.length > 0) score = Math.min(score, 2);

  return { valid: failures.length === 0, failures, score: Math.min(score, 4) };
}

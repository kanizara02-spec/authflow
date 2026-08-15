"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_POLICY = void 0;
exports.checkPasswordPolicy = checkPasswordPolicy;
/**
 * Centralized password policy. Backend enforces this on every password
 * write path (register, change password, reset password). The frontend
 * imports the same constants to render a live strength meter so the rules
 * never drift between client and server.
 */
exports.PASSWORD_POLICY = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
};
const commonPasswords_1 = require("./commonPasswords");
function checkPasswordPolicy(password) {
    const failures = [];
    if (password.length < exports.PASSWORD_POLICY.minLength) {
        failures.push(`Must be at least ${exports.PASSWORD_POLICY.minLength} characters`);
    }
    if (exports.PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
        failures.push("Must include an uppercase letter");
    }
    if (exports.PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
        failures.push("Must include a lowercase letter");
    }
    if (exports.PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
        failures.push("Must include a number");
    }
    if (exports.PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
        failures.push("Must include a special character");
    }
    if (commonPasswords_1.COMMON_PASSWORDS.has(password.toLowerCase())) {
        failures.push("This password is too common");
    }
    let score = 0;
    if (password.length >= exports.PASSWORD_POLICY.minLength)
        score++;
    if (password.length >= 16)
        score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password))
        score++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password))
        score++;
    if (failures.length > 0)
        score = Math.min(score, 2);
    return { valid: failures.length === 0, failures, score: Math.min(score, 4) };
}

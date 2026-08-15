import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Single transporter, configured from env. In development this points at
 * MailHog (docker-compose service `mailhog`, SMTP on 1025, web UI on 8025)
 * so verification/reset emails can be inspected without a real mailbox.
 * In production, point EMAIL_HOST/PORT/USER/PASSWORD at a real provider —
 * nothing else in the app needs to change.
 */
const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_SECURE,
  auth: env.EMAIL_USER ? { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD } : undefined,
});

async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? `<p>${opts.text}</p>`,
    });
  } catch (err) {
    // Email delivery must never crash a request (e.g. registration should
    // still succeed even if MailHog is briefly down); log and move on.
    // Production hardening: push these onto a retry queue instead.
    logger.error({ err, to: opts.to }, "Failed to send email");
  }
}

export function sendVerificationEmail(to: string, verifyUrl: string) {
  return sendMail({
    to,
    subject: "Verify your AuthFlow account",
    text: `Welcome to AuthFlow. Verify your email: ${verifyUrl}\nThis link expires in 24 hours.`,
  });
}

export function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendMail({
    to,
    subject: "Reset your AuthFlow password",
    text: `A password reset was requested for this account: ${resetUrl}\nThis link expires in 30 minutes. If you didn't request this, you can safely ignore this email.`,
  });
}

export function sendSecurityEmail(opts: { to: string; subject: string; text: string }) {
  return sendMail(opts);
}

export function sendEmailChangeConfirmation(to: string, confirmUrl: string) {
  return sendMail({
    to,
    subject: "Confirm your new email address",
    text: `A request was made to change your AuthFlow account email to this address: ${confirmUrl}\nThis link expires in 24 hours.`,
  });
}

export function sendEmailChangeNotification(to: string, newEmail: string) {
  return sendMail({
    to,
    subject: "Security Alert: Email change requested",
    text: `A request was submitted to change your account email to ${newEmail}. If you did not make this request, please change your password immediately.`,
  });
}

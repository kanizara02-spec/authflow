import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { rotateRefreshToken, issueAccessToken } from "../services/token.service";
import { getRequestContext } from "../utils/requestContext";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies";
import { revokeSession } from "../services/session.service";
import { Errors } from "../utils/errors";
import { userRepository } from "../repositories/user.repository";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.register(req.body);
    // Same generic response whether or not the email was already
    // registered — see authService.register for the enumeration rationale.
    res.status(201).json({
      success: true,
      data: { message: "If this email isn't already registered, a verification link has been sent." },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.verifyEmail(req.body.token);
    res.json({ success: true, data: { message: "Email verified. You can now log in." } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = getRequestContext(req);
    const result = await authService.login({ ...req.body, ctx });

    if (result.status === "TOTP_REQUIRED") {
      return res.json({ success: true, data: { status: "TOTP_REQUIRED", challengeToken: result.challengeToken } });
    }

    setAuthCookies(res, result);
    res.json({ success: true, data: { status: "AUTHENTICATED" } });
  } catch (err) {
    next(err);
  }
}

export async function verifyTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = getRequestContext(req);
    const result = await authService.completeLoginWithTotp(req.body.challengeToken, req.body.code, ctx);
    if (result.status !== "AUTHENTICATED") throw Errors.invalidTotp();
    setAuthCookies(res, result);
    res.json({ success: true, data: { status: "AUTHENTICATED" } });
  } catch (err) {
    next(err);
  }
}

export async function verifyRecovery(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = getRequestContext(req);
    const result = await authService.completeLoginWithRecoveryCode(req.body.challengeToken, req.body.recoveryCode, ctx);
    if (result.status !== "AUTHENTICATED") throw Errors.invalidRecoveryCode();
    setAuthCookies(res, result);
    res.json({ success: true, data: { status: "AUTHENTICATED" } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const presented = req.cookies?.refresh_token as string | undefined;
    if (!presented) return next(Errors.unauthorized());

    const ctx = getRequestContext(req);
    const { token: newRefreshToken, userId, sessionId } = await rotateRefreshToken(presented, ctx);
    const user = await userRepository.findById(userId);
    if (!user) return next(Errors.unauthorized());

    const accessToken = issueAccessToken({ sub: userId, role: user.role as "USER" | "ADMIN", sid: sessionId });
    setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });
    res.json({ success: true, data: { status: "REFRESHED" } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user) {
      await revokeSession(req.user.id, req.user.sessionId);
    }
    clearAuthCookies(res);
    res.json({ success: true, data: { message: "Logged out." } });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.json({ success: true, data: { message: "If that email is registered, a reset link has been sent." } });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, data: { message: "Password has been reset. Please log in." } });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword, req.user.sessionId);
    res.json({ success: true, data: { message: "Password changed. Other sessions have been signed out." } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const user = await userRepository.findById(req.user.id);
    if (!user) return next(Errors.unauthorized());
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        twoFactorEnabled: user.securitySettings?.twoFactorEnabled ?? false,
        emailVerified: !!user.emailVerifiedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function requestEmailChange(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const ctx = getRequestContext(req);
    await authService.requestEmailChange(
      req.user.id,
      req.body.newEmail,
      req.body.currentPassword,
      req.body.code,
      ctx
    );
    res.json({
      success: true,
      data: { message: "Confirmation link sent to your new email address. Please check your inbox." },
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmEmailChange(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = getRequestContext(req);
    await authService.confirmEmailChange(req.body.token, ctx);
    clearAuthCookies(res);
    res.json({
      success: true,
      data: { message: "Email changed successfully. Please log in with your new email address." },
    });
  } catch (err) {
    next(err);
  }
}

export async function googleRedirect(_req: Request, res: Response, next: NextFunction) {
  try {
    const { buildGoogleAuthUrl } = await import("../services/googleOAuth.service");
    const { generateOpaqueToken } = await import("@authflow/security");
    const { logger } = await import("../utils/logger");
    const state = generateOpaqueToken();
    res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 10 * 60_000 });
    logger.info("Initiating Google OAuth redirect to Google consent screen");
    const url = buildGoogleAuthUrl(state);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { handleGoogleOAuthCallback } = await import("../services/googleOAuth.service");
    const { env } = await import("../config/env");
    const { logger } = await import("../utils/logger");
    logger.info("Processing incoming /api/auth/google/callback request");
    const code = req.query.code as string;
    const state = req.query.state as string;
    const expectedState = req.cookies?.oauth_state;

    res.clearCookie("oauth_state", { path: "/" });

    if (!code) {
      logger.warn("Google OAuth callback missing authorization code parameter");
      return res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent("Google consent denied")}`);
    }

    const ctx = getRequestContext(req);
    const result = await handleGoogleOAuthCallback(code, state, expectedState, ctx);

    if (result.status === "TOTP_REQUIRED") {
      logger.info("Google OAuth login matched account with 2FA enabled — issuing 2FA challenge redirect");
      return res.redirect(`${env.FRONTEND_URL}/login?step=2fa&challengeToken=${result.challengeToken}`);
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);
    logger.info("Google OAuth login successful. Setting session cookies and redirecting to dashboard");
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (err: any) {
    const { env } = await import("../config/env");
    const { logger } = await import("../utils/logger");
    const message = err?.message || "Google authentication failed";
    logger.error(`Google OAuth callback failed: ${message}`);
    res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(message)}`);
  }
}

import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
  verify2faSchema,
  verifyRecoverySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  emailVerifySchema,
  requestEmailChangeSchema,
  confirmEmailChangeSchema,
} from "../validators/auth.schemas";
import {
  loginRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
  totpVerifyRateLimiter,
  recoveryCodeRateLimiter,
  refreshRateLimiter,
} from "../middleware/rateLimit";

const router = Router();

router.post("/register", registrationRateLimiter, validate(registerSchema), authController.register);
router.post("/verify-email", validate(emailVerifySchema), authController.verifyEmail);

router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/verify-2fa", totpVerifyRateLimiter, validate(verify2faSchema), authController.verifyTwoFactor);
router.post("/recovery/verify", recoveryCodeRateLimiter, validate(verifyRecoverySchema), authController.verifyRecovery);

router.post("/refresh", refreshRateLimiter, authController.refresh);
router.post("/logout", requireAuth, authController.logout);

router.post("/forgot-password", passwordResetRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", passwordResetRateLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post("/change-password", requireAuth, validate(changePasswordSchema), authController.changePassword);

router.post("/change-email/request", requireAuth, validate(requestEmailChangeSchema), authController.requestEmailChange);
router.post("/change-email/confirm", validate(confirmEmailChangeSchema), authController.confirmEmailChange);

router.get("/me", requireAuth, authController.me);

router.get("/google", authController.googleRedirect);
router.get("/google/callback", authController.googleCallback);

export default router;

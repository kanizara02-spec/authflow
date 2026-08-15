import { Router } from "express";
import * as securityController from "../controllers/security.controller";
import * as deviceController from "../controllers/device.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  setup2faVerifySchema,
  disable2faSchema,
  regenerateRecoveryCodesSchema,
  sessionIdParamSchema,
  deviceIdParamSchema,
} from "../validators/auth.schemas";
import { totpVerifyRateLimiter, enrollmentRateLimiter } from "../middleware/rateLimit";

const router = Router();
router.use(requireAuth);

// 2FA
router.post("/2fa/setup", enrollmentRateLimiter, securityController.setupTwoFactor);
router.post("/2fa/verify", totpVerifyRateLimiter, validate(setup2faVerifySchema), securityController.verifyTwoFactorSetup);
router.post("/2fa/disable", totpVerifyRateLimiter, validate(disable2faSchema), securityController.disableTwoFactor);
router.post("/recovery/regenerate", totpVerifyRateLimiter, validate(regenerateRecoveryCodesSchema), securityController.regenerateRecoveryCodes);

// Sessions
router.get("/sessions", securityController.listSessions);
router.delete("/sessions/:id", validate(sessionIdParamSchema), securityController.revokeSessionById);
router.post("/sessions/revoke-others", securityController.revokeAllOtherSessions);

// Devices
router.get("/devices", deviceController.listDevices);
router.delete("/devices/:id", validate(deviceIdParamSchema), deviceController.revokeDevice);

// Notifications, audit trail, score
router.get("/notifications", securityController.listNotifications);
router.get("/events", securityController.listEvents);
router.get("/score", securityController.getSecurityScore);

export default router;

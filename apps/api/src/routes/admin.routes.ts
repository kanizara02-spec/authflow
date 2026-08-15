import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get("/security/overview", adminController.overview);
router.get("/security/events", adminController.listSecurityEvents);
router.get("/users", adminController.listUsers);

export default router;

import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { readLimiter } from "../config/rateLimiter";
import { getDashboardStats, getDashboardLive } from "../controllers/stats.controller";

const router = Router();

// GET /api/stats — Dashboard summary stats
router.get(
  "/",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getDashboardStats
);

// GET /api/stats/live — Live dashboard feed (recent calls + alerts)
router.get(
  "/live",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getDashboardLive
);

export default router;

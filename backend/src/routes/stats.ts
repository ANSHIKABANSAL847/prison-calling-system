import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { readLimiter } from "../config/rateLimiter";
import { getDashboardStats } from "../controllers/stats.controller";

const router = Router();

// GET /api/stats — Dashboard summary stats
router.get(
  "/",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getDashboardStats
);

export default router;

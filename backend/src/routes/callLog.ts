import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { readLimiter } from "../config/rateLimiter";
import {
  getCallLogs,
  getCallLogBySession,
  getCallLogStats,
} from "../controllers/callLog.controller";

const router = Router();

// ──────────────────────────────────────
// GET /api/call-logs/stats/summary
// Must be registered BEFORE /:sessionId to avoid route conflict
// ──────────────────────────────────────
router.get(
  "/stats/summary",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getCallLogStats
);

// ──────────────────────────────────────
// GET /api/call-logs
// ──────────────────────────────────────
router.get(
  "/",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getCallLogs
);

// ──────────────────────────────────────
// GET /api/call-logs/:sessionId
// ──────────────────────────────────────
router.get(
  "/:sessionId",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getCallLogBySession
);

export default router;

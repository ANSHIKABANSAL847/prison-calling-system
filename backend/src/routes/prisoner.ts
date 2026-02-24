import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { writeLimiter, readLimiter } from "../config/rateLimiter";
import { createPrisonerSchema } from "../validators/prisoner.validators";
import { createPrisoner, getAllPrisoners } from "../controllers/prisoner.controller";

const router = Router();

// ──────────────────────────────────────
// GET /api/prisoners/list — List all prisoners (basic info)
// Rate limited: 60 reads / 15 min
// ──────────────────────────────────────
router.get(
  "/list",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getAllPrisoners
);

// ──────────────────────────────────────
// POST /api/prisoners/add-prisoner — Add a new prisoner
// Only Admin and Jailer can add prisoners
// Rate limited: 30 writes / 15 min
// ──────────────────────────────────────
router.post(
  "/add-prisoner",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  validate(createPrisonerSchema),
  createPrisoner
);

export default router;

import express from "express";
import { getAnalyticsDashboard } from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.get("/dashboard", authenticate, getAnalyticsDashboard);

export default router;
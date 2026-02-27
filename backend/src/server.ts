import dotenv from "dotenv";
dotenv.config();

// ── Fail fast if critical secrets are missing ──
const REQUIRED_ENV = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DB_URL"] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import authRoutes from "./routes/auth";
import prisonerRoutes from "./routes/prisoner";
import contactRoutes from "./routes/contact";
import statsRoutes from "./routes/stats";
import uploadRoutes from "./routes/upload";
import callLogRoutes from "./routes/callLog";
import { connectDB } from "./config/db";
import { seedAdmin } from "./config/seed";
import { seedCallLogs } from "./config/seedCallLogs";
import { globalLimiter } from "./config/rateLimiter";
import voiceRoutes from "./routes/voice";
import { authenticate } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust first proxy (needed for accurate IP in rate limiting behind Nginx/etc.) ──
app.set("trust proxy", 1);

// ── Security & optimization middleware ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-origin" }, // blocks cross-origin reads of /uploads
  })
);
app.use(compression());                     // Gzip response compression
app.use(hpp());                             // Prevent HTTP parameter pollution
app.use(mongoSanitize());                   // Prevent NoSQL injection (strips $ and . from req.body/query/params)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "50kb" }));   // Body limit to prevent large payloads
app.use(cookieParser());
app.use(globalLimiter);                     // Global rate limit: 100 req / 15 min

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/prisoners", prisonerRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/call-logs", callLogRoutes);
app.use("/api/voice", voiceRoutes);

// ── Protect voice recordings behind JWT authentication ──
// Public static assets (e.g. public images) can be added separately without auth
app.use("/uploads/voices", authenticate, express.static("uploads/voices"));


// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "PICS Backend is running" });
});

// Connect to DB → Seed admin → Start server
async function bootstrap() {
  await connectDB();
  await seedAdmin();
  await seedCallLogs();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

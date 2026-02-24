import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import authRoutes from "./routes/auth";
import prisonerRoutes from "./routes/prisoner";
import { connectDB } from "./config/db";
import { seedAdmin } from "./config/seed";
import { globalLimiter } from "./config/rateLimiter";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & optimization middleware ──
app.use(helmet());                          // Secure HTTP headers
app.use(compression());                     // Gzip response compression
app.use(hpp());                             // Prevent HTTP parameter pollution
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));   // Body limit to prevent large payloads
app.use(cookieParser());
app.use(globalLimiter);                     // Global rate limit: 100 req / 15 min

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/prisoners", prisonerRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "PICS Backend is running" });
});

// Connect to DB → Seed admin → Start server
async function bootstrap() {
  await connectDB();
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

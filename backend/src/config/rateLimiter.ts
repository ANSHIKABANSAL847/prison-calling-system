import rateLimit from "express-rate-limit";

// ──────────────────────────────────────
// Global limiter — applies to all routes
// ──────────────────────────────────────

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: { message: "Too many requests, please try again after 15 minutes" },
});

// ──────────────────────────────────────
// Auth limiter — stricter for login/OTP
// skipFailedRequests: false (default) — counts every attempt
// This ensures brute-force attempts count even when they fail
// ──────────────────────────────────────

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // count ALL attempts (including successful) to prevent bypass
  message: { message: "Too many authentication attempts, try again after 15 minutes" },
});

// ──────────────────────────────────────
// Write limiter — for POST/PUT/DELETE on resources
// ──────────────────────────────────────

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 write operations per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many write requests, please try again later" },
});

// ──────────────────────────────────────
// Read limiter — for GET on resources
// ──────────────────────────────────────
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 read requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many read requests, please try again later" },
});

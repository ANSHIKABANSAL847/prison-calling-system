const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { sendOtpEmail } = require("../utils/mailer");
const { setTokenCookies, verifyRefreshToken } = require("../utils/tokens");
const { authenticate } = require("../middleware/auth");

// ──────────────────────────────────────
// In-memory OTP store  (swap with Redis/DB in production)
// Map<email, { otp, role, expiresAt }>
// ──────────────────────────────────────
const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// ──────────────────────────────────────
// STEP 1:  POST /api/auth/login
// Validates email + password + role, then sends OTP
// ──────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    // --- Validate credentials per role ---
    if (role === "Admin") {
      if (email !== process.env.ADMIN_ID || password !== process.env.ADMIN_PASS) {
        return res.status(401).json({ message: "Invalid Admin credentials" });
      }
    } else if (role === "Jailer") {
      // TODO: Replace with real DB lookup
      // For now, allow any non-empty credentials for Jailer demo
    } else {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    // --- Generate & send OTP ---
    const otp = generateOtp();
    otpStore.set(email, {
      otp,
      role,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    await sendOtpEmail(email, otp);

    console.log(`[OTP] Sent to ${email}: ${otp}`); // dev helper — remove in prod

    return res.json({ message: "OTP sent to your email", otpSent: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Failed to send OTP. Check SMTP config." });
  }
});

// ──────────────────────────────────────
// STEP 2:  POST /api/auth/verify-otp
// Verifies the OTP, then sets HTTP-only JWT cookies
// ──────────────────────────────────────
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const record = otpStore.get(email);

  if (!record) {
    return res.status(400).json({ message: "No OTP requested for this email" });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: "OTP has expired. Please request a new one." });
  }

  if (record.otp !== otp) {
    return res.status(401).json({ message: "Invalid OTP" });
  }

  // OTP valid — clear it
  otpStore.delete(email);

  // Issue JWT cookies
  const userPayload = { email, role: record.role };
  setTokenCookies(res, userPayload);

  return res.json({
    message: "Login successful",
    user: userPayload,
  });
});

// ──────────────────────────────────────
// POST /api/auth/refresh
// Refresh token rotation — issues new access + refresh tokens
// ──────────────────────────────────────
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const userPayload = { email: decoded.email, role: decoded.role };

    // Rotate: issue brand-new pair
    setTokenCookies(res, userPayload);

    return res.json({ message: "Tokens refreshed", user: userPayload });
  } catch (err) {
    // Clear stale cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

// ──────────────────────────────────────
// POST /api/auth/logout
// Clears both cookies
// ──────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  return res.json({ message: "Logged out" });
});

// ──────────────────────────────────────
// GET /api/auth/me
// Returns current user from JWT (protected)
// ──────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
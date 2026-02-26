import { Router, Request, Response } from "express";
import crypto from "crypto";
import { sendOtpEmail, sendJailerCredentialsEmail, sendPasswordResetOtpEmail } from "../utils/mailer";
import { setTokenCookies, verifyRefreshToken } from "../utils/tokens";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { authLimiter, globalLimiter } from "../config/rateLimiter";
import {
  loginSchema,
  verifyOtpSchema,
  createJailerSendOtpSchema,
  createJailerVerifyOtpSchema,
  forgotPasswordSendOtpSchema,
  forgotPasswordResetSchema,
} from "../validators/auth.validators";
import User from "../models/User";

const router = Router();

// ──────────────────────────────────────
// In-memory OTP store  (swap with Redis/DB in production)
// ──────────────────────────────────────
interface OtpRecord {
  otp: string;
  role: string;
  expiresAt: number;
}

interface JailerOtpRecord {
  otp: string;
  jailerName: string;
  jailerEmail: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpRecord>();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ──────────────────────────────────────
// In-memory store for Create-Jailer OTP
// ──────────────────────────────────────
const jailerOtpStore = new Map<string, JailerOtpRecord>();

// ──────────────────────────────────────
// OTP attempt tracker — per email brute-force protection
// ──────────────────────────────────────
interface AttemptRecord { count: number; lockedUntil: number; }
const otpAttempts = new Map<string, AttemptRecord>();
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function consumeAttempt(key: string): { allowed: boolean; attemptsLeft: number } {
  const now = Date.now();
  const rec = otpAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > now) return { allowed: false, attemptsLeft: 0 };
  rec.count += 1;
  if (rec.count >= MAX_OTP_ATTEMPTS) {
    rec.lockedUntil = now + OTP_LOCKOUT_MS;
    rec.count = 0;
  }
  otpAttempts.set(key, rec);
  const attemptsLeft = MAX_OTP_ATTEMPTS - rec.count;
  return { allowed: true, attemptsLeft };
}

function clearAttempts(key: string): void {
  otpAttempts.delete(key);
}

/** Constant-time string comparison to prevent timing attacks */
function timingSafeOtpMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ──────────────────────────────────────
// STEP 1:  POST /api/auth/login
// Validates email + password + role, then sends OTP
// ──────────────────────────────────────
router.post("/login", authLimiter, validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body as {
      email: string;
      password: string;
      role: string;
    };

    // --- Validate credentials per role ---
    const user = await User.findOne({ email, role });

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account is deactivated. Contact admin." });
      return;
    }

    // --- Generate & send OTP ---
    const otp = generateOtp();
    otpStore.set(email, {
      otp,
      role,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    await sendOtpEmail(email, otp);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV][OTP] Sent to ${email}: ${otp}`);
    }

    res.json({ message: "OTP sent to your email", otpSent: true });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Failed to send OTP. Check SMTP config." });
  }
});

// ──────────────────────────────────────
// STEP 2:  POST /api/auth/verify-otp
// Verifies the OTP, then sets HTTP-only JWT cookies
// ──────────────────────────────────────
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), (req: Request, res: Response): void => {
  const { email, otp } = req.body as { email: string; otp: string };

  const record = otpStore.get(email);

  if (!record) {
    res.status(400).json({ message: "No OTP requested for this email" });
    return;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    clearAttempts(email);
    res.status(400).json({ message: "OTP has expired. Please request a new one." });
    return;
  }

  const attempt = consumeAttempt(email);
  if (!attempt.allowed) {
    res.status(429).json({ message: "Too many failed OTP attempts. Please request a new OTP after 15 minutes." });
    return;
  }

  if (!timingSafeOtpMatch(record.otp, otp)) {
    res.status(401).json({ message: "Invalid OTP" });
    return;
  }

  // OTP valid — clear it and reset attempts
  otpStore.delete(email);
  clearAttempts(email);

  // Issue JWT cookies
  const userPayload = { email, role: record.role };
  setTokenCookies(res, userPayload);

  res.json({
    message: "Login successful",
    user: userPayload,
  });
});

// ──────────────────────────────────────
// POST /api/auth/refresh
// Refresh token rotation — issues new access + refresh tokens
// ──────────────────────────────────────
router.post("/refresh", authLimiter, (req: Request, res: Response): void => {
  const token = req.cookies.refreshToken as string | undefined;

  if (!token) {
    res.status(401).json({ message: "No refresh token" });
    return;
  }

  try {
    const decoded = verifyRefreshToken(token);
    const userPayload = { email: decoded.email, role: decoded.role };

    // Rotate: issue brand-new pair
    setTokenCookies(res, userPayload);

    res.json({ message: "Tokens refreshed", user: userPayload });
  } catch {
    // Clear stale cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

// ──────────────────────────────────────
// POST /api/auth/logout
// Clears both cookies
// ──────────────────────────────────────
router.post("/logout", globalLimiter, (_req: Request, res: Response): void => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  res.json({ message: "Logged out" });
});

// ──────────────────────────────────────
// GET /api/auth/me
// Returns current user from JWT (protected)
// ──────────────────────────────────────
router.get("/me", authenticate, (req: Request, res: Response): void => {
  res.json({ user: req.user });
});

// ──────────────────────────────────────
// POST /api/auth/create-jailer/send-otp
// Admin-only: sends OTP to admin's own email to verify jailer creation
// ──────────────────────────────────────
router.post(
  "/create-jailer/send-otp",
  authenticate,
  authorize("Admin"),
  validate(createJailerSendOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { jailerName, jailerEmail } = req.body as {
        jailerName: string;
        jailerEmail: string;
      };

      const adminEmail = req.user!.email;
      const otp = generateOtp();

      jailerOtpStore.set(adminEmail, {
        otp,
        jailerName,
        jailerEmail,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
      });

      await sendOtpEmail(adminEmail, otp);

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV][CREATE-JAILER OTP] Sent to admin ${adminEmail}: ${otp}`);
      }

      res.json({ message: "OTP sent to your admin email for verification", otpSent: true });
    } catch (err) {
      console.error("Create jailer OTP error:", err);
      res.status(500).json({ message: "Failed to send OTP. Check SMTP config." });
    }
  }
);

// ──────────────────────────────────────
// POST /api/auth/create-jailer/verify-otp
// Admin-only: verifies OTP and creates the jailer account
// ──────────────────────────────────────
router.post(
  "/create-jailer/verify-otp",
  authenticate,
  authorize("Admin"),
  validate(createJailerVerifyOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { otp } = req.body as { otp: string };
      const adminEmail = req.user!.email;

      const record = jailerOtpStore.get(adminEmail);

      if (!record) {
        res.status(400).json({ message: "No OTP requested. Please start again." });
        return;
      }

      if (Date.now() > record.expiresAt) {
        jailerOtpStore.delete(adminEmail);
        clearAttempts(`jailer:${adminEmail}`);
        res.status(400).json({ message: "OTP has expired. Please request a new one." });
        return;
      }

      const jailerAttempt = consumeAttempt(`jailer:${adminEmail}`);
      if (!jailerAttempt.allowed) {
        res.status(429).json({ message: "Too many failed OTP attempts. Please request a new OTP after 15 minutes." });
        return;
      }

      if (!timingSafeOtpMatch(record.otp, otp)) {
        res.status(401).json({ message: "Invalid OTP" });
        return;
      }

      // OTP valid — clear it and reset attempts
      const { jailerName, jailerEmail } = record;
      jailerOtpStore.delete(adminEmail);
      clearAttempts(`jailer:${adminEmail}`);

      // Generate a random password for the jailer
      const generatedPassword = crypto.randomBytes(6).toString("base64url");

      // Check if jailer email already exists
      const existingUser = await User.findOne({ email: jailerEmail });
      if (existingUser) {
        res.status(409).json({ message: "A user with this email already exists" });
        return;
      }

      // Persist jailer to database (password hashed by pre-save hook)
      await User.create({
        name: jailerName,
        email: jailerEmail,
        password: generatedPassword,
        role: "Jailer",
        isActive: true,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV][JAILER CREATED] Name: ${jailerName}, Email: ${jailerEmail}`);
      }

      // Send login credentials to the jailer's email
      await sendJailerCredentialsEmail(jailerEmail, jailerName, generatedPassword);

      res.json({
        message: "Jailer created successfully. Credentials sent to their email.",
        jailer: { name: jailerName, email: jailerEmail, role: "Jailer" },
      });
    } catch (err) {
      console.error("Create jailer verify error:", err);
      res.status(500).json({ message: "Jailer created but failed to send credentials email." });
    }
  }
);

// ──────────────────────────────────────
// In-memory store for Forgot-Password OTP
// ──────────────────────────────────────
interface ForgotPasswordOtpRecord {
  otp: string;
  expiresAt: number;
}

const forgotPasswordOtpStore = new Map<string, ForgotPasswordOtpRecord>();

// ──────────────────────────────────────
// POST /api/auth/forgot-password/send-otp
// Public: validates email exists, sends OTP
// ──────────────────────────────────────
router.post(
  "/forgot-password/send-otp",
  authLimiter,
  validate(forgotPasswordSendOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body as { email: string };

      const user = await User.findOne({ email });
      if (!user) {
        // Return 200 to avoid user enumeration
        res.json({ message: "If that email is registered, an OTP has been sent.", otpSent: true });
        return;
      }

      const otp = generateOtp();
      forgotPasswordOtpStore.set(email, {
        otp,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
      });

      await sendPasswordResetOtpEmail(email, otp);

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV][FORGOT-PW OTP] Sent to ${email}: ${otp}`);
      }

      res.json({ message: "If that email is registered, an OTP has been sent.", otpSent: true });
    } catch (err) {
      console.error("Forgot password send-otp error:", err);
      res.status(500).json({ message: "Failed to send OTP. Please try again later." });
    }
  }
);

// ──────────────────────────────────────
// POST /api/auth/forgot-password/reset
// Public: verifies OTP and sets new password
// ──────────────────────────────────────
router.post(
  "/forgot-password/reset",
  authLimiter,
  validate(forgotPasswordResetSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otp, newPassword } = req.body as {
        email: string;
        otp: string;
        newPassword: string;
      };

      const record = forgotPasswordOtpStore.get(email);

      if (!record) {
        res.status(400).json({ message: "No OTP requested for this email. Please start again." });
        return;
      }

      if (Date.now() > record.expiresAt) {
        forgotPasswordOtpStore.delete(email);
        clearAttempts(`reset:${email}`);
        res.status(400).json({ message: "OTP has expired. Please request a new one." });
        return;
      }

      const resetAttempt = consumeAttempt(`reset:${email}`);
      if (!resetAttempt.allowed) {
        res.status(429).json({ message: "Too many failed OTP attempts. Please request a new OTP after 15 minutes." });
        return;
      }

      if (!timingSafeOtpMatch(record.otp, otp)) {
        res.status(401).json({ message: "Invalid OTP. Please check and try again." });
        return;
      }

      // OTP valid — clear it and update password
      forgotPasswordOtpStore.delete(email);
      clearAttempts(`reset:${email}`);

      const user = await User.findOne({ email });
      if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
      }

      user.password = newPassword; // hashed by pre-save hook
      await user.save();

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV][FORGOT-PW] Password reset for ${email}`);
      }

      res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (err) {
      console.error("Forgot password reset error:", err);
      res.status(500).json({ message: "Failed to reset password. Please try again." });
    }
  }
);

export default router;

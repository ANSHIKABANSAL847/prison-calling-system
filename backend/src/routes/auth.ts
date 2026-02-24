import { Router, Request, Response } from "express";
import crypto from "crypto";
import { sendOtpEmail, sendJailerCredentialsEmail } from "../utils/mailer";
import { setTokenCookies, verifyRefreshToken } from "../utils/tokens";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { authLimiter } from "../config/rateLimiter";
import {
  loginSchema,
  verifyOtpSchema,
  createJailerSendOtpSchema,
  createJailerVerifyOtpSchema,
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

    console.log(`[OTP] Sent to ${email}: ${otp}`); // dev helper — remove in prod

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
    res.status(400).json({ message: "OTP has expired. Please request a new one." });
    return;
  }

  if (record.otp !== otp) {
    res.status(401).json({ message: "Invalid OTP" });
    return;
  }

  // OTP valid — clear it
  otpStore.delete(email);

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
router.post("/refresh", (req: Request, res: Response): void => {
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
router.post("/logout", (_req: Request, res: Response): void => {
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

      console.log(`[CREATE-JAILER OTP] Sent to admin ${adminEmail}: ${otp}`);

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
        res.status(400).json({ message: "OTP has expired. Please request a new one." });
        return;
      }

      if (record.otp !== otp) {
        res.status(401).json({ message: "Invalid OTP" });
        return;
      }

      // OTP valid — clear it
      const { jailerName, jailerEmail } = record;
      jailerOtpStore.delete(adminEmail);

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

      console.log(`[JAILER CREATED] Name: ${jailerName}, Email: ${jailerEmail}`);

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

export default router;

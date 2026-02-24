import Joi from "joi";

// ──────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email is required",
  }),
  password: Joi.string().min(1).required().messages({
    "any.required": "Password is required",
    "string.empty": "Password is required",
  }),
  role: Joi.string().valid("Admin", "Jailer").required().messages({
    "any.only": "Role must be either Admin or Jailer",
    "any.required": "Role is required",
    "string.empty": "Role is required",
  }),
});

// ──────────────────────────────────────
// POST /api/auth/verify-otp
// ──────────────────────────────────────
export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email is required",
  }),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only digits",
      "any.required": "OTP is required",
      "string.empty": "OTP is required",
    }),
});

// ──────────────────────────────────────
// POST /api/auth/create-jailer/send-otp
// ──────────────────────────────────────
export const createJailerSendOtpSchema = Joi.object({
  jailerName: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "Jailer name must be at least 2 characters",
    "string.max": "Jailer name must not exceed 100 characters",
    "any.required": "Jailer name is required",
    "string.empty": "Jailer name is required",
  }),
  jailerEmail: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address for the jailer",
    "any.required": "Jailer email is required",
    "string.empty": "Jailer email is required",
  }),
});

// ──────────────────────────────────────
// POST /api/auth/create-jailer/verify-otp
// ──────────────────────────────────────
export const createJailerVerifyOtpSchema = Joi.object({
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only digits",
      "any.required": "OTP is required",
      "string.empty": "OTP is required",
    }),
});

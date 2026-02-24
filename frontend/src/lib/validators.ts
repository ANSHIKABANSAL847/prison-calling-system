import Joi from "joi";

// ──────────────────────────────────────
// Login form — Step 1: credentials
// ──────────────────────────────────────
export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: false }).required().messages({
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email is required",
  }),
  password: Joi.string().min(1).required().messages({
    "any.required": "Password is required",
    "string.empty": "Password is required",
  }),
  role: Joi.string().valid("Admin", "Jailer").required().messages({
    "any.only": "Please select a valid role",
    "any.required": "Please select a role",
    "string.empty": "Please select a role",
  }),
});

// ──────────────────────────────────────
// Login form — Step 2: OTP verification
// ──────────────────────────────────────
export const otpSchema = Joi.object({
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only digits",
      "any.required": "Please enter the OTP",
      "string.empty": "Please enter the OTP",
    }),
});

// ──────────────────────────────────────
// Create Jailer — Step 1: name + email
// ──────────────────────────────────────
export const createJailerSchema = Joi.object({
  jailerName: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must not exceed 100 characters",
    "any.required": "Jailer name is required",
    "string.empty": "Jailer name is required",
  }),
  jailerEmail: Joi.string().email({ tlds: false }).required().messages({
    "string.email": "Please enter a valid email address",
    "any.required": "Jailer email is required",
    "string.empty": "Jailer email is required",
  }),
});

/**
 * Helper: validate data against a Joi schema.
 * Returns the first error message or null if valid.
 */
export function validateField<T>(
  schema: Joi.ObjectSchema,
  data: T
): string | null {
  const { error } = schema.validate(data, { abortEarly: true });
  return error ? error.details[0].message : null;
}

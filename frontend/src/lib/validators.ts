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

// ──────────────────────────────────────
// Add Prisoner — all required fields
// ──────────────────────────────────────
export const addPrisonerSchema = Joi.object({
  prisonerId: Joi.number().integer().positive().required().messages({
    "number.base": "Prisoner ID must be a number",
    "number.integer": "Prisoner ID must be an integer",
    "number.positive": "Prisoner ID must be positive",
    "any.required": "Prisoner ID is required",
  }),
  fullName: Joi.string().trim().min(2).max(150).required().messages({
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name must not exceed 150 characters",
    "any.required": "Full name is required",
    "string.empty": "Full name is required",
  }),
  dateOfBirth: Joi.date().max("now").required().messages({
    "date.max": "Date of birth cannot be in the future",
    "any.required": "Date of birth is required",
  }),
  gender: Joi.string().valid("Male", "Female", "Other").required().messages({
    "any.only": "Gender must be Male, Female, or Other",
    "any.required": "Gender is required",
    "string.empty": "Gender is required",
  }),
  photo: Joi.string().uri().required().messages({
    "string.uri": "Photo must be a valid URL",
    "any.required": "Photo URL is required",
    "string.empty": "Photo URL is required",
  }),
  aadhaarNumber: Joi.string()
    .pattern(/^\d{12}$/)
    .optional()
    .allow("", null)
    .messages({
      "string.pattern.base": "Aadhaar number must be exactly 12 digits",
    }),
  caseNumber: Joi.string().trim().required().messages({
    "any.required": "Case number is required",
    "string.empty": "Case number is required",
  }),
  prisonName: Joi.string().trim().required().messages({
    "any.required": "Prison name is required",
    "string.empty": "Prison name is required",
  }),
  sentenceYears: Joi.number().min(0).required().messages({
    "number.min": "Sentence cannot be negative",
    "any.required": "Sentence duration is required",
  }),
  riskTags: Joi.array()
    .items(
      Joi.string().valid(
        "High Risk",
        "Escape Risk",
        "Violent Offender",
        "Gang Affiliated",
        "Good Conduct"
      )
    )
    .optional()
    .default([])
    .messages({
      "any.only":
        "Invalid risk tag. Allowed: High Risk, Escape Risk, Violent Offender, Gang Affiliated, Good Conduct",
    }),
});

// ──────────────────────────────────────
// Update Prisoner — all fields optional, at least 1 required
// ──────────────────────────────────────
export const updatePrisonerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).optional().messages({
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name must not exceed 150 characters",
  }),
  dateOfBirth: Joi.date().max("now").optional().messages({
    "date.max": "Date of birth cannot be in the future",
  }),
  gender: Joi.string().valid("Male", "Female", "Other").optional().messages({
    "any.only": "Gender must be Male, Female, or Other",
  }),
  photo: Joi.string().uri().optional().messages({
    "string.uri": "Photo must be a valid URL",
  }),
  aadhaarNumber: Joi.string()
    .pattern(/^\d{12}$/)
    .optional()
    .allow("", null)
    .messages({
      "string.pattern.base": "Aadhaar number must be exactly 12 digits",
    }),
  caseNumber: Joi.string().trim().optional(),
  prisonName: Joi.string().trim().optional(),
  sentenceYears: Joi.number().min(0).optional().messages({
    "number.min": "Sentence cannot be negative",
  }),
  riskTags: Joi.array()
    .items(
      Joi.string().valid(
        "High Risk",
        "Escape Risk",
        "Violent Offender",
        "Gang Affiliated",
        "Good Conduct"
      )
    )
    .optional()
    .messages({
      "any.only":
        "Invalid risk tag. Allowed: High Risk, Escape Risk, Violent Offender, Gang Affiliated, Good Conduct",
    }),
  isActive: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

// ──────────────────────────────────────
// Add Contact — required fields for a new contact
// ──────────────────────────────────────
const RELATION_VALUES = [
  "Wife",
  "Husband",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Lawyer",
  "Friend",
  "Other",
] as const;

export const addContactSchema = Joi.object({
  contactName: Joi.string().trim().min(2).max(150).required().messages({
    "string.min": "Contact name must be at least 2 characters",
    "string.max": "Contact name must not exceed 150 characters",
    "any.required": "Contact name is required",
    "string.empty": "Contact name is required",
  }),
  relation: Joi.string()
    .valid(...RELATION_VALUES)
    .required()
    .messages({
      "any.only": `Relation must be one of: ${RELATION_VALUES.join(", ")}`,
      "any.required": "Relation is required",
      "string.empty": "Relation is required",
    }),
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^\+?\d{10,15}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone number must be 10-15 digits, optionally starting with +",
      "any.required": "Phone number is required",
      "string.empty": "Phone number is required",
    }),
  photo: Joi.string().uri().optional().allow("", null).messages({
    "string.uri": "Photo must be a valid URL",
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

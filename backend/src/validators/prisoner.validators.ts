import Joi from "joi";

// ──────────────────────────────────────
// Create Prisoner
// ──────────────────────────────────────
export const createPrisonerSchema = Joi.object({
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
  }),

  dateOfBirth: Joi.date().max("now").required().messages({
    "date.max": "Date of birth cannot be in the future",
    "any.required": "Date of birth is required",
  }),

  gender: Joi.string().valid("Male", "Female", "Other").required().messages({
    "any.only": "Gender must be Male, Female, or Other",
    "any.required": "Gender is required",
  }),

  photo: Joi.string().uri().required().messages({
    "string.uri": "Photo must be a valid URL",
    "any.required": "Photo is required",
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
  }),

  prisonName: Joi.string().trim().required().messages({
    "any.required": "Prison name is required",
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

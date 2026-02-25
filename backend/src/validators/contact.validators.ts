import Joi from "joi";

// ──────────────────────────────────────
// Allowed relation values (mirrors the Contact model enum)
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

// ──────────────────────────────────────
// POST /api/contacts/:prisonerId — Add a contact
// ──────────────────────────────────────
export const createContactSchema = Joi.object({
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

// ──────────────────────────────────────
// PUT /api/contacts/:contactId — Update a contact
// ──────────────────────────────────────
export const updateContactSchema = Joi.object({
  contactName: Joi.string().trim().min(2).max(150).optional().messages({
    "string.min": "Contact name must be at least 2 characters",
    "string.max": "Contact name must not exceed 150 characters",
  }),

  relation: Joi.string()
    .valid(...RELATION_VALUES)
    .optional()
    .messages({
      "any.only": `Relation must be one of: ${RELATION_VALUES.join(", ")}`,
    }),

  phoneNumber: Joi.string()
    .trim()
    .pattern(/^\+?\d{10,15}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Phone number must be 10-15 digits, optionally starting with +",
    }),

  photo: Joi.string().uri().optional().allow("", null).messages({
    "string.uri": "Photo must be a valid URL",
  }),

  isVerified: Joi.boolean().optional().messages({
    "boolean.base": "isVerified must be a boolean",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

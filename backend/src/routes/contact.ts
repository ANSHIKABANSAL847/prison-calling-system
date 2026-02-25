import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { writeLimiter, readLimiter } from "../config/rateLimiter";
import {
  createContactSchema,
  updateContactSchema,
} from "../validators/contact.validators";
import {
  getAllContacts,
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  toggleVerify,
} from "../controllers/contact.controller";

const router = Router();

// ──────────────────────────────────────
// GET /api/contacts/all — List all contacts (overview)
// ──────────────────────────────────────
router.get(
  "/all",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getAllContacts
);

// ──────────────────────────────────────
// GET /api/contacts/:prisonerId — List all contacts for a prisoner
// ──────────────────────────────────────
router.get(
  "/:prisonerId",
  readLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  getContacts
);

// ──────────────────────────────────────
// POST /api/contacts/:prisonerId — Add a contact to a prisoner
// ──────────────────────────────────────
router.post(
  "/:prisonerId",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  validate(createContactSchema),
  createContact
);

// ──────────────────────────────────────
// PUT /api/contacts/:contactId — Update a contact
// ──────────────────────────────────────
router.put(
  "/:contactId",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  validate(updateContactSchema),
  updateContact
);

// ──────────────────────────────────────
// DELETE /api/contacts/:contactId — Delete a contact
// ──────────────────────────────────────
router.delete(
  "/:contactId",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  deleteContact
);

// ──────────────────────────────────────
// PATCH /api/contacts/:contactId/verify — Toggle verification status
// ──────────────────────────────────────
router.patch(
  "/:contactId/verify",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  toggleVerify
);

export default router;

import { Request, Response } from "express";
import mongoose from "mongoose";
import Contact from "../models/Contact";
import Prisoner from "../models/Prisoner";

// ──────────────────────────────────────
// GET /api/contacts/all — List all contacts across all prisoners
// ──────────────────────────────────────
export async function getAllContacts(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const contacts = await Contact.find()
      .populate("prisoner", "fullName prisonerId")
      .select("contactName relation phoneNumber photo isVerified voiceSamples verificationAccuracy prisoner createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ count: contacts.length, contacts });
  } catch (err) {
    console.error("Get all contacts error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// GET /api/contacts/:prisonerId — List contacts for a prisoner
// ──────────────────────────────────────
export async function getContacts(req: Request, res: Response): Promise<void> {
  try {
    const { prisonerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(prisonerId)) {
      res.status(400).json({ message: "Invalid prisoner ID" });
      return;
    }

    const prisoner = await Prisoner.findById(prisonerId).select("_id").lean();
    if (!prisoner) {
      res.status(404).json({ message: "Prisoner not found" });
      return;
    }

    const contacts = await Contact.find({ prisoner: prisonerId })
      .select("contactName relation phoneNumber photo isVerified createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ count: contacts.length, contacts });
  } catch (err) {
    console.error("Get contacts error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// POST /api/contacts/:prisonerId — Add a contact to a prisoner
// ──────────────────────────────────────
export async function createContact(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { prisonerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(prisonerId)) {
      res.status(400).json({ message: "Invalid prisoner ID" });
      return;
    }

    const prisoner = await Prisoner.findById(prisonerId).select("_id").lean();
    if (!prisoner) {
      res.status(404).json({ message: "Prisoner not found" });
      return;
    }

    const { contactName, relation, phoneNumber, photo } = req.body;

    // Check duplicate phone for this prisoner
    const existing = await Contact.findOne({
      prisoner: prisonerId,
      phoneNumber,
    }).lean();
    if (existing) {
      res.status(409).json({
        message: "A contact with this phone number already exists for this prisoner",
      });
      return;
    }

    // Limit max contacts per prisoner (security & scalability)
    const contactCount = await Contact.countDocuments({ prisoner: prisonerId });
    if (contactCount >= 20) {
      res.status(400).json({
        message: "Maximum of 20 contacts allowed per prisoner",
      });
      return;
    }

    const contact = await Contact.create({
      prisoner: prisonerId,
      contactName,
      relation,
      phoneNumber,
      photo: photo || undefined,
      isVerified: false,
    });

    res.status(201).json({
      message: "Contact added successfully",
      contact,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({
        message: "Duplicate contact: phone number already registered for this prisoner",
      });
      return;
    }
    console.error("Create contact error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// PUT /api/contacts/:contactId — Update a contact
// ──────────────────────────────────────
export async function updateContact(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { contactId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      res.status(400).json({ message: "Invalid contact ID" });
      return;
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    // If phone number is being changed, check for duplicates
    if (req.body.phoneNumber && req.body.phoneNumber !== contact.phoneNumber) {
      const duplicate = await Contact.findOne({
        prisoner: contact.prisoner,
        phoneNumber: req.body.phoneNumber,
        _id: { $ne: contactId },
      }).lean();

      if (duplicate) {
        res.status(409).json({
          message: "Another contact with this phone number already exists for this prisoner",
        });
        return;
      }
    }

    const updated = await Contact.findByIdAndUpdate(contactId, req.body, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();

    res.json({ message: "Contact updated successfully", contact: updated });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ message: "Duplicate phone number for this prisoner" });
      return;
    }
    console.error("Update contact error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// DELETE /api/contacts/:contactId — Remove a contact
// ──────────────────────────────────────
export async function deleteContact(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { contactId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      res.status(400).json({ message: "Invalid contact ID" });
      return;
    }

    const contact = await Contact.findByIdAndDelete(contactId).lean();
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    res.json({ message: "Contact deleted successfully" });
  } catch (err) {
    console.error("Delete contact error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// PATCH /api/contacts/:contactId/verify — Toggle verification
// ──────────────────────────────────────
export async function toggleVerify(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { contactId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      res.status(400).json({ message: "Invalid contact ID" });
      return;
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    contact.isVerified = !contact.isVerified;
    await contact.save();

    res.json({
      message: `Contact ${contact.isVerified ? "verified" : "unverified"} successfully`,
      contact,
    });
  } catch (err) {
    console.error("Toggle verify error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

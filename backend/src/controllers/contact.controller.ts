import { Request, Response } from "express";
import mongoose from "mongoose";
import Contact from "../models/Contact";
import Prisoner from "../models/Prisoner";

// Relations where only ONE contact is allowed per prisoner
const SINGLETON_RELATIONS = ["Father", "Mother", "Wife", "Husband"] as const;
type SingletonRelation = typeof SINGLETON_RELATIONS[number];
function isSingleton(relation: string): relation is SingletonRelation {
  return SINGLETON_RELATIONS.includes(relation as SingletonRelation);
}

// ──────────────────────────────────────
// GET /api/contacts/all — List contacts with pagination + search
// Query params: page (default 1), limit (default 10), search
// ──────────────────────────────────────
export async function getAllContacts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"),  10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10)));
    const search = String(req.query.search ?? "").trim();

    const filter: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(search, "i");
      filter.$or = [
        { contactName: rx },
        { relation: rx },
        { phoneNumber: rx },
      ];
    }

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .populate("prisoner", "fullName prisonerId")
        .select("contactName relation phoneNumber photo isVerified voiceSamples verificationAccuracy prisoner createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Contact.countDocuments(filter),
    ]);

    res.json({ count: contacts.length, total, totalPages: Math.ceil(total / limit), page, contacts });
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

    // Check duplicate phone globally (a phone number can only belong to one contact)
    const existing = await Contact.findOne({ phoneNumber }).lean();
    if (existing) {
      res.status(409).json({
        message: "This phone number is already registered to another contact in the system.",
      });
      return;
    }

    // Enforce singleton relations (Father, Mother, Wife, Husband — only one each)
    if (isSingleton(relation)) {
      const singletonExists = await Contact.findOne({
        prisoner: prisonerId,
        relation,
      }).lean();
      if (singletonExists) {
        res.status(409).json({
          message: `This prisoner already has a ${relation} registered. Only one ${relation} is allowed per prisoner.`,
        });
        return;
      }
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
        message: "This phone number is already registered to another contact in the system.",
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

    // If phone number is being changed, check globally for duplicates
    if (req.body.phoneNumber && req.body.phoneNumber !== contact.phoneNumber) {
      const duplicate = await Contact.findOne({
        phoneNumber: req.body.phoneNumber,
        _id: { $ne: contactId },
      }).lean();

      if (duplicate) {
        res.status(409).json({
          message: "This phone number is already registered to another contact in the system.",
        });
        return;
      }
    }

    // Enforce singleton relations on update
    const incomingRelation = req.body.relation;
    if (incomingRelation && isSingleton(incomingRelation) && incomingRelation !== contact.relation) {
      const singletonExists = await Contact.findOne({
        prisoner: contact.prisoner,
        relation: incomingRelation,
        _id: { $ne: contactId },
      }).lean();
      if (singletonExists) {
        res.status(409).json({
          message: `This prisoner already has a ${incomingRelation} registered. Only one ${incomingRelation} is allowed per prisoner.`,
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
      res.status(409).json({ message: "This phone number is already registered to another contact in the system." });
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

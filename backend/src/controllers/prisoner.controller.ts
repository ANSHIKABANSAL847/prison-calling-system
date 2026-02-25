import { Request, Response } from "express";
import mongoose from "mongoose";
import Prisoner from "../models/Prisoner";
import Contact from "../models/Contact";

// ──────────────────────────────────────
// GET /api/prisoners/list — List all prisoners (basic details)
// ──────────────────────────────────────
export async function getAllPrisoners(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const prisoners = await Prisoner.find()
      .select("prisonerId fullName gender prisonName riskTags photo dateOfBirth isActive aadhaarNumber caseNumber sentenceYears")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    res.json({
      count: prisoners.length,
      prisoners,
    });
  } catch (err) {
    console.error("Get prisoners error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// POST /api/prisoners/add-prisoner — Add a new prisoner
// ──────────────────────────────────────
export async function createPrisoner(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      prisonerId,
      fullName,
      dateOfBirth,
      gender,
      photo,
      aadhaarNumber,
      caseNumber,
      prisonName,
      sentenceYears,
      riskTags,
    } = req.body;

    // Check duplicate prisonerId
    const existingById = await Prisoner.findOne({ prisonerId });
    if (existingById) {
      res.status(409).json({ message: `Prisoner ID ${prisonerId} already exists` });
      return;
    }

    // Check duplicate Aadhaar (if provided)
    if (aadhaarNumber) {
      const existingByAadhaar = await Prisoner.findOne({ aadhaarNumber });
      if (existingByAadhaar) {
        res.status(409).json({ message: "A prisoner with this Aadhaar number already exists" });
        return;
      }
    }

    const prisoner = await Prisoner.create({
      prisonerId,
      fullName,
      dateOfBirth,
      gender,
      photo,
      aadhaarNumber: aadhaarNumber || undefined,
      caseNumber,
      prisonName,
      sentenceYears,
      riskTags: riskTags || [],
    });

    res.status(201).json({
      message: "Prisoner added successfully",
      prisoner,
    });
  } catch (err: any) {
    // Handle Mongoose duplicate-key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      res.status(409).json({ message: `Duplicate value for ${field}` });
      return;
    }

    console.error("Create prisoner error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// GET /api/prisoners/:id — Get single prisoner with contacts
// ──────────────────────────────────────
export async function getPrisonerById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const prisoner = await Prisoner.findById(req.params.id).lean({ virtuals: true });

    if (!prisoner) {
      res.status(404).json({ message: "Prisoner not found" });
      return;
    }

    // Fetch authorized contacts for this prisoner
    const contacts = await Contact.find({ prisoner: req.params.id })
      .select("contactName relation phoneNumber photo isVerified")
      .lean();

    res.json({ prisoner, contacts });
  } catch (err) {
    console.error("Get prisoner by ID error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// PUT /api/prisoners/:id — Update a prisoner
// ──────────────────────────────────────
export async function updatePrisoner(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid prisoner ID" });
      return;
    }

    const prisoner = await Prisoner.findById(id);
    if (!prisoner) {
      res.status(404).json({ message: "Prisoner not found" });
      return;
    }

    // If aadhaarNumber is being changed, check for duplicates
    if (
      req.body.aadhaarNumber &&
      req.body.aadhaarNumber !== prisoner.aadhaarNumber
    ) {
      const existingByAadhaar = await Prisoner.findOne({
        aadhaarNumber: req.body.aadhaarNumber,
        _id: { $ne: id },
      }).lean();
      if (existingByAadhaar) {
        res.status(409).json({
          message: "A prisoner with this Aadhaar number already exists",
        });
        return;
      }
    }

    const updated = await Prisoner.findByIdAndUpdate(id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    }).lean({ virtuals: true });

    res.json({ message: "Prisoner updated successfully", prisoner: updated });
  } catch (err: any) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      res.status(409).json({ message: `Duplicate value for ${field}` });
      return;
    }
    console.error("Update prisoner error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// DELETE /api/prisoners/:id — Delete a prisoner and all contacts
// ──────────────────────────────────────
export async function deletePrisoner(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid prisoner ID" });
      return;
    }

    const prisoner = await Prisoner.findByIdAndDelete(id).lean();
    if (!prisoner) {
      res.status(404).json({ message: "Prisoner not found" });
      return;
    }

    // Cascade: delete all contacts linked to this prisoner
    const deleteResult = await Contact.deleteMany({ prisoner: id });

    res.json({
      message: "Prisoner and associated contacts deleted successfully",
      contactsDeleted: deleteResult.deletedCount,
    });
  } catch (err) {
    console.error("Delete prisoner error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

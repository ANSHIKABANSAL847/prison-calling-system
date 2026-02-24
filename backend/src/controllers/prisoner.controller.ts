import { Request, Response } from "express";
import Prisoner from "../models/Prisoner";

// ──────────────────────────────────────
// GET /api/prisoners/list — List all prisoners (basic details)
// ──────────────────────────────────────
export async function getAllPrisoners(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const prisoners = await Prisoner.find({ isActive: true })
      .select("prisonerId fullName gender prisonName riskTags photo dateOfBirth")
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

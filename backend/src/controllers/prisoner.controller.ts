import { Request, Response } from "express";
import mongoose from "mongoose";
import Prisoner from "../models/Prisoner";

// ──────────────────────────────────────
// GET /api/prisoners/list — List prisoners with pagination + search
// ──────────────────────────────────────
export async function getAllPrisoners(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10))
    );
    const search = String(req.query.search ?? "").trim();

    const filter: Record<string, any> = {};

    if (search) {
      const rx = new RegExp(search, "i");
      const numericId = Number(search);

      filter.$or = [
        { fullName: rx },
        { prisonName: rx },
        ...(Number.isFinite(numericId) ? [{ prisonerId: numericId }] : []),
      ];
    }

    const [prisoners, total] = await Promise.all([
      Prisoner.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      Prisoner.countDocuments(filter),
    ]);

    res.json({
      count: prisoners.length,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      prisoners,
    });
  } catch (err) {
    console.error("Get prisoners error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// POST /api/prisoners/add-prisoner
// ──────────────────────────────────────
export async function createPrisoner(
  req: Request,
  res: Response,
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

    const existingById = await Prisoner.findOne({ prisonerId });
    if (existingById) {
      res.status(409).json({
        message: `Prisoner ID ${prisonerId} already exists`,
      });
      return;
    }

    if (aadhaarNumber) {
      const existingByAadhaar = await Prisoner.findOne({ aadhaarNumber });
      if (existingByAadhaar) {
        res.status(409).json({
          message: "A prisoner with this Aadhaar number already exists",
        });
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
// GET /api/prisoners/:id
// ──────────────────────────────────────
export async function getPrisonerById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const prisoner = await Prisoner.findById(req.params.id).lean({
      virtuals: true,
    });

    if (!prisoner) {
      res.status(404).json({ message: "Prisoner not found" });
      return;
    }

    //  No more contacts
    res.json({ prisoner });
  } catch (err) {
    console.error("Get prisoner by ID error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// PUT /api/prisoners/:id
// ──────────────────────────────────────
export async function updatePrisoner(
  req: Request,
  res: Response,
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
      returnDocument: "after",
      runValidators: true,
    }).lean({ virtuals: true });

    res.json({
      message: "Prisoner updated successfully",
      prisoner: updated,
    });
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
// DELETE /api/prisoners/:id
// ──────────────────────────────────────
export async function deletePrisoner(
  req: Request,
  res: Response,
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


    res.json({
      message: "Prisoner deleted successfully",
    });
  } catch (err) {
    console.error("Delete prisoner error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
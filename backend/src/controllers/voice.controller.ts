import { Request, Response } from "express";
import mongoose from "mongoose";
import Contact from "../models/Contact";
import Prisoner from "../models/Prisoner";
import cloudinary from "../config/cloudinary";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";


/** Upload buffer to Cloudinary and return the secure URL */
async function uploadAudioToCloudinary(
  buffer: Buffer,
  publicId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "pics/voices",
        resource_type: "video", // Cloudinary uses "video" for all audio
        public_id: publicId,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/** Delete a previous Cloudinary voice asset (non-fatal) */
async function deletePreviousVoice(url: string): Promise<void> {
  try {
    const parts = url.split("/");
    const filenameWithExt = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${filenameWithExt.split(".")[0]}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch {
    // Non-fatal
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/voice/enroll
// Accepts either { prisonerId } for prisoner enrollment
//             or { contactId }  for contact enrollment
// ──────────────────────────────────────────────────────────────────────────────
export async function enrollVoice(req: Request, res: Response): Promise<void> {
  try {
    const { contactId, prisonerId } = req.body;

    if (!contactId && !prisonerId) {
      res.status(400).json({ message: "Provide either contactId or prisonerId" });
      return;
    }

    if (!req.file || !req.file.buffer) {
      res.status(400).json({ message: "No audio file uploaded" });
      return;
    }

    // ── Prisoner voice enrollment ────────────────────────────────────────────
    if (prisonerId) {
      if (!mongoose.Types.ObjectId.isValid(prisonerId)) {
        res.status(400).json({ message: "Invalid prisonerId" });
        return;
      }

      const prisoner = await Prisoner.findById(prisonerId);
      if (!prisoner) {
        res.status(404).json({ message: "Prisoner not found" });
        return;
      }

      if (prisoner.voicePath) {
        await deletePreviousVoice(prisoner.voicePath);
      }

      const voiceUrl = await uploadAudioToCloudinary(
        req.file.buffer,
        `prisoner_${prisonerId}_${Date.now()}`
      );

      prisoner.voicePath = voiceUrl;
      prisoner.voiceSamples = (prisoner.voiceSamples || 0) + 1;
      await prisoner.save();

      res.status(200).json({
        message: "Prisoner voice enrolled successfully",
        voicePath: voiceUrl,
        prisonerId: prisoner._id,
      });
      return;
    }

    // ── Contact voice enrollment ─────────────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      res.status(400).json({ message: "Invalid contactId" });
      return;
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    if (contact.voicePath) {
      await deletePreviousVoice(contact.voicePath);
    }

    const voiceUrl = await uploadAudioToCloudinary(
      req.file.buffer,
      `contact_${contactId}_${Date.now()}`
    );

    contact.voicePath = voiceUrl;
    contact.voiceSamples = (contact.voiceSamples || 0) + 1;
    contact.verificationAccuracy = 0;
    contact.isVerified = true;
    // 🔹 Send audio to Python ML service
    const formData = new FormData();
    formData.append("name", contact.contactName);
    formData.append("file", fs.createReadStream(req.file.path));

    const mlResponse = await axios.post(
      "http://127.0.0.1:8000/enroll",
      formData,
      { headers: formData.getHeaders() }
    );

    // 🔹 Save info in DB
    contact.voicePath = req.file.path;
    contact.voiceSamples = (contact.voiceSamples || 0) + 1;
    contact.verificationAccuracy = 0;
    await contact.save();

    res.status(200).json({
      message: "Voice enrolled successfully",
      voicePath: voiceUrl,
      ml: mlResponse.data,
      contactId: contact._id,
      isVerified: true,
    });
  } catch (err) {
    console.error("Enroll voice error:", err);
    res.status(500).json({ message: "Failed to enroll voice" });
  }
}

export async function verifyVoice(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No audio file uploaded" });
      return;
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path));

    const mlResponse = await axios.post(
      "http://127.0.0.1:8000/verify",
      formData,
      { headers: formData.getHeaders() }
    );

    res.status(200).json({
      message: "Voice verification completed",
      result: mlResponse.data,
    });
  } catch (err) {
    console.error("Verify voice error:", err);
    res.status(500).json({ message: "Failed to verify voice" });
  }
}
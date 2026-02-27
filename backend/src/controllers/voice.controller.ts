import { Request, Response } from "express";
import mongoose from "mongoose";
import Contact from "../models/Contact";
import Prisoner from "../models/Prisoner";
import cloudinary from "../config/cloudinary";
import axios from "axios";
import FormData from "form-data";

const ML_BASE = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";
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

export async function enrollVoice(req: Request, res: Response): Promise<void> {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file?.originalname);

    const contactId = req.body.contactId;

    if (!req.file) {
      res.status(400).json({ message: "No audio file uploaded" });
      return;
    }

    if (!contactId) {
      res.status(400).json({ message: "contactId missing from form-data" });
      return;
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    const formData = new FormData();
    formData.append("contactId", contactId);
    formData.append("file", req.file.buffer, {
      filename: "voice.wav",
      contentType: "audio/wav",
    });

    const mlResponse = await axios.post(`${ML_BASE}/enroll`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    contact.voiceSamples = (contact.voiceSamples || 0) + 1;
    contact.isVerified = true;
    await contact.save();

    res.json({ success: true });

  } catch (err: any) {
    console.error("ENROLL ERROR FULL:", err);
    res.status(500).json({ message: err.message });
  }
}
export async function verifyVoice(req: Request, res: Response): Promise<void> {
  try {
    console.log("Verify request received");

    if (!req.file || !req.file.buffer) {
      console.error(" No file in request");
      res.status(400).json({ message: "No audio file uploaded" });
      return;
    }

    console.log("File received:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.buffer.length,
    });

    const formData = new FormData();
    formData.append("contactId", req.body.contactId);
    formData.append("file", req.file.buffer, {
      filename: "verify.wav", // FORCE WAV NAME
      contentType: "audio/wav", // FORCE WAV TYPE
      knownLength: req.file.buffer.length,
    });

    console.log(" Sending to ML service:", `${ML_BASE}/verify`);

    const mlResponse = await axios.post(`${ML_BASE}/verify`, formData, {
      headers: { ...formData.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000,
    });

    console.log(" ML response:", mlResponse.data);

    res.status(200).json({
      message: "Voice verification completed",
      result: mlResponse.data,
    });
  } catch (err: any) {
    console.error(" VERIFY VOICE ERROR FULL:", err?.response?.data || err.message || err);
    res.status(500).json({
      message: "Failed to verify voice",
      error: err?.response?.data || err.message || "Unknown error",
    });
  }
}
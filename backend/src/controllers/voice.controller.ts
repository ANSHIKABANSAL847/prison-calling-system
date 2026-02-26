import { Request, Response } from "express";
import mongoose from "mongoose";
import Contact from "../models/Contact";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export async function enrollVoice(req: Request, res: Response): Promise<void> {
  try {
    const { contactId } = req.body;

    if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
      res.status(400).json({ message: "Invalid contactId" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No audio file uploaded" });
      return;
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }

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
      ml: mlResponse.data,
      contactId: contact._id,
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
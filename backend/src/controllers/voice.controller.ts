import { Request, Response } from "express";
import mongoose from "mongoose";
import Contact from "../models/Contact";

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

    // Save voice info
    contact.voicePath = req.file.path;
    contact.voiceSamples = (contact.voiceSamples || 0) + 1;
    contact.verificationAccuracy = 0;

    await contact.save();

    res.status(200).json({
      message: "Voice enrolled successfully",
      voicePath: req.file.path,
      contactId: contact._id,
    });
  } catch (err) {
    console.error("Enroll voice error:", err);
    res.status(500).json({ message: "Failed to enroll voice" });
  }
}
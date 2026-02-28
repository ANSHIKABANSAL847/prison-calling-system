import  { Request, Response } from "express";
import Prisoner from "../models/Prisoner";
import CallLog from "../models/CallLog";
import axios from "axios";
import FormData from "form-data";

const ML_BASE = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";

// ─────────────────────────────────────────────
// ENROLL MULTIPLE VOICES (PRISONER)
// ─────────────────────────────────────────────
export async function enrollMultipleVoices(req: Request, res: Response) {
  try {
    const { prisonerId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files?.length)
      return res.status(400).json({ message: "No audio files provided" });

    const prisoner = await Prisoner.findById(prisonerId);
    if (!prisoner)
      return res.status(404).json({ message: "Prisoner not found" });

    const form = new FormData();
    form.append("prisonerId", prisonerId); // ML expects this
    files.forEach((file) =>
      form.append("samples", file.buffer, file.originalname)
    );

    const mlResponse = await axios.post(`${ML_BASE}/enroll_multi`, form, {
      headers: form.getHeaders(),
      timeout: 120000,
    });

    prisoner.voiceSamples = files.length;
    prisoner.isVoiceEnrolled = true;
    await prisoner.save();

    res.json({
      success: true,
      uniqueSpeakers: mlResponse.data.unique_speakers_enrolled,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// VERIFY VOICE
// ─────────────────────────────────────────────
export async function verifyVoiceAdvanced(req: Request, res: Response) {
  try {
    const { prisonerId } = req.body;
    const file = req.file;

    if (!file)
      return res.status(400).json({ message: "No audio file provided" });

    const prisoner = await Prisoner.findById(prisonerId);
    if (!prisoner || !prisoner.isVoiceEnrolled)
      return res.status(400).json({ message: "Prisoner not enrolled" });

    const form = new FormData();
    form.append("contactId", prisonerId);
    form.append("file", file.buffer, file.originalname);

    const mlResponse = await axios.post(`${ML_BASE}/verify_advanced`, form, {
      headers: form.getHeaders(),
      timeout: 180000,
    });

    const result = mlResponse.data;

    await CallLog.create({
      sessionId: `CALL-${Date.now()}`,
      agent: (req as any).user?.id,
      prisoner: prisoner._id,
      date: new Date(),
      durationSeconds: Math.round(result.audio_quality.duration_sec),
      verificationResult: result.authorized ? "Verified" : "Failed",
      similarityScore: Math.round(result.overall_confidence * 100),
      speakerCount: result.speakers_in_call,
      unknownSpeakers: result.unknown_speakers,
      riskLevel: result.risk_level,
    });

    prisoner.verificationPercent = Math.round(
      result.overall_confidence * 100
    );
    prisoner.lastVerificationDate = new Date();
    prisoner.totalCallsMonitored += 1;
    await prisoner.save();

    res.json({
      success: true,
      authorized: result.authorized,
      similarityScore: Math.round(result.overall_confidence * 100),
      speakerCount: result.speakers_in_call,
      unknownSpeakers: result.unknown_speakers,
      riskLevel: result.risk_level,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function analyzeSpeakers(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file)
      return res.status(400).json({ message: "No audio file provided" });
    const form = new FormData();
    form.append("audio", file.buffer, file.originalname);
    const mlResponse = await axios.post(`${ML_BASE}/analyze_speakers`, form, {
      headers: form.getHeaders(),
      timeout: 120000,
    });
    res.json({ success: true, analysis: mlResponse.data });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

import { Request, Response } from "express";
import Prisoner from "../models/Prisoner";
import CallLog from "../models/CallLog";
import cloudinary from "../config/cloudinary";
import axios from "axios";
import FormData from "form-data";

const ML_BASE = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";
const THRESHOLD = 0.70;


// ─────────────────────────────────────────────
// Upload buffer to Cloudinary
// ─────────────────────────────────────────────
async function uploadToCloudinary(
  buffer: Buffer,
  publicId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "prisoner/voices",
        resource_type: "video",
        public_id: publicId,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}


// ─────────────────────────────────────────────
// DOWNLOAD CLOUDINARY FILE
// ─────────────────────────────────────────────
async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return Buffer.from(res.data);
}


// ─────────────────────────────────────────────
// ENROLL VOICE
// ─────────────────────────────────────────────
export async function enrollMultipleVoices(req: Request, res: Response) {

  try {

    const prisonerId = req.body.prisonerId?.toString().trim();
    const files = req.files as Express.Multer.File[];

    if (!prisonerId)
      return res.status(400).json({ message: "Missing prisonerId" });

    if (!files?.length)
      return res.status(400).json({ message: "No audio files provided" });

    const prisoner = await Prisoner.findById(prisonerId);

    if (!prisoner)
      return res.status(404).json({ message: "Prisoner not found" });

    const form = new FormData();

    files.forEach((file) => {
      form.append("samples", file.buffer, {
        filename: file.originalname || "sample.wav",
      });
    });

    const mlRes = await axios.post(
      `${ML_BASE}/extract_speakers`,
      form,
      { headers: form.getHeaders() }
    );

    const embeddings = mlRes.data?.embeddings || [];

    if (!embeddings.length) {
      return res.status(400).json({
        message: "No voice embeddings extracted",
      });
    }

    prisoner.voiceEmbeddings = embeddings;
    prisoner.voiceSamples = embeddings.length;
    prisoner.isVoiceEnrolled = true;

    await prisoner.save();

    res.json({
      success: true,
      samplesStored: embeddings.length,
    });

  } catch (err: any) {

    console.error("ENROLL ERROR:", err);

    res.status(500).json({
      message: err.message,
    });

  }

}


// ─────────────────────────────────────────────
// VERIFY VOICE
// ─────────────────────────────────────────────
export async function verifyVoiceAdvanced(req: Request, res: Response) {

  try {

    const prisonerId = req.body.prisonerId?.toString().trim();
    const file = req.file;

    if (!prisonerId)
      return res.status(400).json({ message: "Missing prisonerId" });

    if (!file)
      return res.status(400).json({ message: "No audio file provided" });

    const prisoner = await Prisoner.findById(prisonerId);

    if (!prisoner)
      return res.status(404).json({ message: "Prisoner not found" });

    if (!prisoner.voiceEmbeddings?.length)
      return res.status(400).json({ message: "No enrolled samples found" });

    const form = new FormData();

    form.append("call", file.buffer, { filename: "call.wav" });

    form.append(
      "authorized_embeddings",
      JSON.stringify(prisoner.voiceEmbeddings)
    );

    const mlRes = await axios.post(
      `${ML_BASE}/verify_advanced`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000000,
      }
    );

    const segments = mlRes.data?.segments || [];

    let bestScore = 0;
    let threatDetected = false;
    let transcript = "";
    let riskLevel = "low";

    segments.forEach((s: any) => {

      if (s.similarity > bestScore)
        bestScore = s.similarity;

      if (s.threat_detected)
        threatDetected = true;

      transcript += s.transcript + " ";

      if (s.risk_level === "HIGH")
        riskLevel = "high";

    });

    const similarityScore = Math.round(bestScore * 100);
    const authorized = bestScore >= THRESHOLD;

    await CallLog.create({

      sessionId: `CALL-${Date.now()}`,
      prisoner: prisoner._id,
      date: new Date(),
      verificationResult: authorized ? "Verified" : "Failed",
      similarityScore,
      speakerCount: segments.length,
      emotion: "neutral",
      threatDetected,
      transcript,
      riskLevel

    });

    prisoner.verificationPercent = similarityScore;
    prisoner.totalCallsMonitored += 1;

    await prisoner.save();

    res.json({

      success: true,
      authorized,
      similarityScore,
      segmentsChecked: segments.length,
      threatDetected,
      transcript,
      riskLevel

    });

  } catch (err: any) {

    console.error("VERIFY ERROR:", err);

    res.status(500).json({
      message: err.message,
    });

  }

}


// ─────────────────────────────────────────────
// ANALYZE AUDIO ONLY
// ─────────────────────────────────────────────
export async function analyzeSpeakers(req: Request, res: Response) {

  try {

    if (!req.file)
      return res.status(400).json({ message: "No audio file provided" });

    const form = new FormData();
    form.append("audio", req.file.buffer, { filename: "sample.wav" });

    const mlRes = await axios.post(
      `${ML_BASE}/analyze_speakers`,
      form,
      { headers: form.getHeaders() }
    );

    res.json({
      success: true,
      ...mlRes.data,
    });

  } catch (err: any) {

    console.error("ANALYZE ERROR:", err);

    res.status(500).json({
      message: err.message,
    });

  }

}
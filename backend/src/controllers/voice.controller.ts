import { Request, Response } from "express";
import Prisoner from "../models/Prisoner";
import CallLog from "../models/CallLog";
import cloudinary from "../config/cloudinary";
import axios from "axios";
import FormData from "form-data";

const ML_BASE = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";
const THRESHOLD = 0.65;

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
// Download Cloudinary file
// ─────────────────────────────────────────────
async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return Buffer.from(res.data);
}

// ─────────────────────────────────────────────
// ENROLL (Cloudinary Based)
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

const newEmbeddings: number[][] = [];

for (const file of files) {
  const form = new FormData();
  form.append("audio", file.buffer, { filename: "sample.wav" });

  const mlRes = await axios.post(`${ML_BASE}/extract_embedding`, form, {
    headers: form.getHeaders(),
  });

  console.log("ML response:", mlRes.data);

  if (mlRes.data?.embedding) {
    newEmbeddings.push(mlRes.data.embedding);
  }
}

console.log("Embeddings collected:", newEmbeddings.length);

prisoner.voiceEmbeddings.push(...newEmbeddings);
prisoner.voiceSamples = newEmbeddings.length;
prisoner.isVoiceEnrolled = true;

// 🔥 IMPORTANT — BEFORE SAVE
prisoner.markModified("voiceEmbeddings");

await prisoner.save();

console.log("Saved document:", prisoner);

// VERY IMPORTANT
prisoner.markModified("voiceEmbeddings");


    res.json({
      success: true,
      samplesStored: prisoner.voiceEmbeddings,
    });
  } catch (err: any) {
    console.error("ENROLL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// VERIFY (Stateless Compare)
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

if (!Array.isArray(prisoner.voiceEmbeddings) || prisoner.voiceEmbeddings.length === 0) {
  console.log("Embeddings missing:", prisoner.voiceEmbeddings);
  return res.status(400).json({ message: "No enrolled samples found" });
}

    // Extract live embedding once
    const form = new FormData();
    form.append("audio", file.buffer, { filename: "live.wav" });

    const mlRes = await axios.post(`${ML_BASE}/extract_embedding`, form, {
      headers: form.getHeaders(),
    });

    const liveEmbedding = mlRes.data?.embedding;

    if (!liveEmbedding) {
      return res.status(500).json({ message: "Embedding extraction failed" });
    }

    let bestScore = 0;

    // Compare vectors directly (NO ML CALL INSIDE LOOP)
    for (const storedEmbedding of prisoner.voiceEmbeddings) {
      const dot = storedEmbedding.reduce(
        (sum: number, val: number, i: number) => sum + val * liveEmbedding[i],
        0,
      );

      if (dot > bestScore) bestScore = dot;
    }
    const authorized = bestScore >= THRESHOLD;
    const scorePct = Math.round(bestScore * 100);

    let speakerCount = 1;
    let unknownSpeakers = 0;

    // Fetch live audio speaker count through ML service heuristic
    try {
      const analyzeForm = new FormData();
      analyzeForm.append("audio", file.buffer, { filename: "live.wav" });
      const analyzeRes = await axios.post(`${ML_BASE}/analyze`, analyzeForm, {
        headers: analyzeForm.getHeaders(),
        timeout: 60000,
      });

      speakerCount = analyzeRes.data?.speaker_count ?? 1;

      if (authorized) {
        // If authorized, then at least 1 speaker is known. The rest are unknown.
        unknownSpeakers = Math.max(0, speakerCount - 1);
      } else {
        // If not authorized, all speakers are unknown
        unknownSpeakers = speakerCount;
      }
    } catch (err: any) {
      console.error("Speaker analyze error:", err.message);
    }

    await CallLog.create({
      sessionId: `CALL-${Date.now()}`,
      prisoner: prisoner._id,
      date: new Date(),
      verificationResult: authorized ? "Verified" : "Failed",
      similarityScore: scorePct,
      speakerCount,
      unknownSpeakers,
      riskLevel: authorized && unknownSpeakers === 0 ? "low" : "high",
    });

    prisoner.verificationPercent = scorePct;
    prisoner.totalCallsMonitored += 1;
    await prisoner.save();

    res.json({
      success: true,
      authorized,
      similarityScore: scorePct,
      speakerCount,
      unknownSpeakers,
      riskLevel: authorized && unknownSpeakers === 0 ? "low" : "high",
    });
  } catch (err: any) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}
export async function analyzeSpeakers(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const form = new FormData();
    form.append("audio", req.file.buffer, {
      filename: "sample.wav",
    });

    const mlRes = await axios.post(`${ML_BASE}/analyze`, form, {
      headers: form.getHeaders(),
    });

    const noisePercentage = mlRes.data.noise_score ?? 0;
    const clearAudioPercentage = mlRes.data.clarity_score ?? 0;
    const speakerCount = mlRes.data.speaker_count ?? 1;

    res.json({
      success: true,
      noisePercentage,
      clearAudioPercentage,
      speakerCount,
    });
  } catch (err: any) {
    console.error("ANALYZE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
}

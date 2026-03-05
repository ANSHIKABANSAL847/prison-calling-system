import { Request, Response } from "express";
import Prisoner from "../models/Prisoner";
import CallLog from "../models/CallLog";
import cloudinary from "../config/cloudinary";
import axios from "axios";
import FormData from "form-data";

const ML_BASE = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";
const THRESHOLD = 0.75;

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
// ENROLL
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

    // Extract embeddings from ML service
    for (const file of files) {
      const form = new FormData();
      form.append("audio", file.buffer, { filename: "sample.wav" });

      const mlRes = await axios.post(`${ML_BASE}/extract_embedding`, form, {
        headers: form.getHeaders(),
      });
        console.log("ML RESPONSE:", mlRes.data);
if (
  mlRes.data &&
  Array.isArray(mlRes.data.embedding) &&
  mlRes.data.embedding.length > 0
) {
  newEmbeddings.push(mlRes.data.embedding);
} else {
  console.log("Invalid embedding returned:", mlRes.data);
}
    }

    if (newEmbeddings.length === 0) {
      return res.status(400).json({ message: "No valid embeddings extracted" });
    }

    // Normalize embeddings
    const normalized: number[][] = [];

for (let i = 0; i < newEmbeddings.length; i++) {
  const emb = newEmbeddings[i];

  console.log("Embedding index:", i);
  console.log("Type:", typeof emb);
  console.log("IsArray:", Array.isArray(emb));

  if (!Array.isArray(emb)) {
    throw new Error(`Invalid embedding at index ${i}`);
  }

  normalized.push(normalize(emb));
}

    let centroid: number[];
    let clusterCenters: number[][] = [];

    // If fewer than 2 samples → skip clustering
    centroid = averageEmbedding(normalized);
clusterCenters = [];

    prisoner.voiceEmbeddings = [
      centroid,
      ...clusterCenters,
    ];

    prisoner.voiceSamples = normalized.length;
    prisoner.isVoiceEnrolled = true;

    prisoner.markModified("voiceEmbeddings");
    await prisoner.save();

    res.json({
      success: true,
      samplesStored: prisoner.voiceEmbeddings.length,
    });

  } catch (err: any) {
    console.error("ENROLL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// VERIFY
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
      return res.status(400).json({ message: "No enrolled samples found" });
    }

    const form = new FormData();
    form.append("audio", file.buffer, { filename: "live.wav" });

    const mlRes = await axios.post(`${ML_BASE}/extract_embedding`, form, {
      headers: form.getHeaders(),
    });

    const liveEmbedding = mlRes.data?.embedding;

    if (!liveEmbedding) {
      return res.status(500).json({ message: "Embedding extraction failed" });
    }

    const liveNorm = normalize(liveEmbedding);

    let bestScore = 0;

    for (const storedEmbedding of prisoner.voiceEmbeddings) {
      const dot = storedEmbedding.reduce(
        (sum: number, val: number, i: number) =>
          sum + val * liveNorm[i],
        0
      );

      if (dot > bestScore) bestScore = dot;
    }

    const authorized = bestScore >= THRESHOLD;
    const scorePct = Math.round(bestScore * 100);

    let speakerCount = 1;
    let unknownSpeakers = 0;

    try {
      const analyzeForm = new FormData();
      analyzeForm.append("audio", file.buffer, { filename: "live.wav" });

      const analyzeRes = await axios.post(`${ML_BASE}/analyze`, analyzeForm, {
        headers: analyzeForm.getHeaders(),
        timeout: 60000,
      });

      speakerCount = analyzeRes.data?.speaker_count ?? 1;

      if (authorized) {
        unknownSpeakers = Math.max(0, speakerCount - 1);
      } else {
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

// ─────────────────────────────────────────────
// ANALYZE
// ─────────────────────────────────────────────
export async function analyzeSpeakers(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const form = new FormData();
    form.append("audio", req.file.buffer, { filename: "sample.wav" });

    const mlRes = await axios.post(`${ML_BASE}/analyze`, form, {
      headers: form.getHeaders(),
    });

    res.json({
      success: true,
      noisePercentage: mlRes.data.noise_score ?? 0,
      clearAudioPercentage: mlRes.data.clarity_score ?? 0,
      speakerCount: mlRes.data.speaker_count ?? 1,
    });

  } catch (err: any) {
    console.error("ANALYZE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function normalize(vec?: number[]) {
  if (!Array.isArray(vec)) {
    throw new Error("Invalid embedding passed to normalize()");
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map(v => v / (norm || 1));
}

function averageEmbedding(embeddings: number[][]) {
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);

  embeddings.forEach(e => {
    for (let i = 0; i < dim; i++) {
      avg[i] += e[i];
    }
  });

  for (let i = 0; i < dim; i++) {
    avg[i] /= embeddings.length;
  }

  return normalize(avg);
}
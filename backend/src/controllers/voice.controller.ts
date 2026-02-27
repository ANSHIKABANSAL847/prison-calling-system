import { Request, Response } from "express";
import Contact from "../models/Contact";
import CallLog from "../models/CallLog";
import cloudinary from "../config/cloudinary";
import axios from "axios";
import FormData from "form-data";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const execFileAsync = promisify(execFile);

const ML_BASE = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";

// SpeechBrain ECAPA-TDNN cosine similarity threshold.
const THRESHOLD = 0.65;

// Length of each chunk when splitting long verification audio (seconds).
const CHUNK_SECONDS = 10;

// FFmpeg binary — set FFMPEG_PATH env var to override.
const FFMPEG =
  process.env.FFMPEG_PATH ||
  "C:\\Users\\Satyam Pandey\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe";

/** Upload audio buffer to Cloudinary and return the secure URL */
async function uploadAudioToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "pics/voices", resource_type: "video", public_id: publicId },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/** Download a remote URL into a Buffer */
async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  return Buffer.from(res.data);
}

/**
 * Split an audio buffer into CHUNK_SECONDS-second WAV chunks using FFmpeg.
 * Returns an array of Buffers (one per chunk).
 * Falls back to [originalBuffer] if FFmpeg fails or audio is shorter than one chunk.
 */
async function splitIntoChunks(buffer: Buffer): Promise<Buffer[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-chunk-"));
  const inputPath = path.join(tmpDir, "input.audio");
  const chunkPattern = path.join(tmpDir, "chunk_%03d.wav");

  try {
    fs.writeFileSync(inputPath, buffer);

    await execFileAsync(FFMPEG, [
      "-y",
      "-i", inputPath,
      "-f", "segment",
      "-segment_time", String(CHUNK_SECONDS),
      "-reset_timestamps", "1",
      "-ac", "1",
      "-ar", "16000",
      chunkPattern,
    ]);

    const chunks: Buffer[] = [];
    for (let i = 0; ; i++) {
      const chunkPath = path.join(tmpDir, `chunk_${String(i).padStart(3, "0")}.wav`);
      if (!fs.existsSync(chunkPath)) break;
      const data = fs.readFileSync(chunkPath);
      // Skip chunks that are too short to be meaningful (< 1 second ≈ < 32 KB at 16kHz/16-bit mono)
      if (data.length > 32000) chunks.push(data);
    }

    return chunks.length > 0 ? chunks : [buffer];
  } catch (err: any) {
    console.warn("  [chunk-split] FFmpeg failed, falling back to full audio:", err.message);
    return [buffer];
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────
// ANALYZE — run quality analysis on an uploaded audio file
// Calls ML /analyze and returns snrDb, clarityScore, speakerCount, etc.
// ─────────────────────────────────────────────
export async function analyzeAudio(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: "No audio file provided" }); return; }

    const form = new FormData();
    form.append("audio", req.file.buffer, { filename: "sample.wav", contentType: req.file.mimetype });

    const mlRes = await axios.post(`${ML_BASE}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    const { snr_db, clarity_score, speaker_count, speaker_segments, duration_sec } = mlRes.data;

    // Human-readable labels
    const noiseLabel = snr_db == null ? "Unknown" : snr_db >= 20 ? "Low noise" : snr_db >= 10 ? "Moderate noise" : "High noise";
    const clarityLabel = clarity_score == null ? "Unknown" : clarity_score >= 70 ? "Clear" : clarity_score >= 40 ? "Fair" : "Unclear";

    res.json({
      snrDb: snr_db,
      clarityScore: clarity_score,
      speakerCount: speaker_count,
      speakerSegments: speaker_segments,
      durationSec: duration_sec,
      noiseLabel,
      clarityLabel,
    });
  } catch (err: any) {
    console.error("ANALYZE ERROR:", err.message);
    res.status(500).json({ message: "Audio analysis failed", detail: err.message });
  }
}

// ─────────────────────────────────────────────
// DELETE SAMPLE — remove a single voice URL from a contact's voicePaths[]
// Body: { contactId, voiceUrl }
// ─────────────────────────────────────────────
export async function deleteVoiceSample(req: Request, res: Response): Promise<void> {
  try {
    const { contactId, voiceUrl } = req.body;
    if (!contactId || !voiceUrl) { res.status(400).json({ message: "contactId and voiceUrl are required" }); return; }

    const contact = await Contact.findById(contactId);
    if (!contact) { res.status(404).json({ message: "Contact not found" }); return; }

    const before = contact.voicePaths?.length ?? 0;
    contact.voicePaths = (contact.voicePaths || []).filter((u: string) => u !== voiceUrl);
    contact.voiceSamples = contact.voicePaths.length;
    if (contact.voicePaths.length === 0) contact.isVerified = false;
    await contact.save();

    // Best-effort delete from Cloudinary (non-blocking)
    try {
      // Extract public_id from URL: everything after /upload/ up to the file extension
      const match = voiceUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (match?.[1]) {
        await cloudinary.uploader.destroy(match[1], { resource_type: "video" });
      }
    } catch (e) {
      console.warn("Cloudinary delete skipped:", e);
    }

    res.json({ success: true, samplesRemaining: contact.voicePaths.length, removed: before - contact.voicePaths.length });
  } catch (err: any) {
    console.error("DELETE SAMPLE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// ENROLL — upload voice sample to Cloudinary and store URL in DB
// Can be called multiple times to add more samples for the same contact.
// ─────────────────────────────────────────────
export async function enrollVoice(req: Request, res: Response): Promise<void> {
  try {
    const contactId = req.body.contactId;
    if (!req.file) { res.status(400).json({ message: "No audio file uploaded" }); return; }
    if (!contactId) { res.status(400).json({ message: "contactId missing" }); return; }

    const contact = await Contact.findById(contactId);
    if (!contact) { res.status(404).json({ message: "Contact not found" }); return; }

    const publicId = `voice_${contactId}_${Date.now()}`;
    const cloudUrl = await uploadAudioToCloudinary(req.file.buffer, publicId);

    contact.voicePaths = [...(contact.voicePaths || []), cloudUrl];
    contact.voiceSamples = contact.voicePaths.length;
    contact.isVerified = true;
    await contact.save();

    res.json({ success: true, samplesStored: contact.voiceSamples });
  } catch (err: any) {
    console.error("ENROLL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// VERIFY — analyze audio quality, detect noise/clarity/speakers, then compare.
// Single speaker  → chunk-based /compare (existing logic).
// Multi-speaker   → /diarize_compare per stored sample (picks best speaker match).
// ─────────────────────────────────────────────
export async function verifyVoice(req: Request, res: Response): Promise<void> {
  try {
    const contactId = req.body.contactId;
    if (!req.file?.buffer) { res.status(400).json({ message: "No audio file uploaded" }); return; }
    if (!contactId) { res.status(400).json({ message: "contactId missing" }); return; }

    const contact = await Contact.findById(contactId);
    if (!contact) { res.status(404).json({ message: "Contact not found" }); return; }

    if (!contact.voicePaths || contact.voicePaths.length === 0) {
      res.status(200).json({
        message: "Voice verification completed",
        result: { authorized: false, score: 0, message: "No voice samples enrolled for this contact" },
      });
      return;
    }

    // ── Step 0: Analyze audio quality (noise, clarity, speaker count) ─────────
    let snrDb  = 0;
    let clarityScore = 0;
    let speakerCount = 1;
    let speakerSegments: unknown[] = [];

    console.log(`[Verify] contactId=${contactId} | audio size=${req.file.buffer.length} bytes`);
    try {
      const analyzeForm = new FormData();
      analyzeForm.append("audio", req.file.buffer, { filename: "audio.audio", contentType: "audio/octet-stream" });
      const analyzeRes = await axios.post(`${ML_BASE}/analyze`, analyzeForm, {
        headers: analyzeForm.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 90000,
      });
      snrDb          = analyzeRes.data?.snr_db        ?? 0;
      clarityScore   = analyzeRes.data?.clarity_score ?? 0;
      speakerCount   = analyzeRes.data?.speaker_count ?? 1;
      speakerSegments = analyzeRes.data?.speaker_segments ?? [];
      console.log(`[Verify] SNR=${snrDb}dB  Clarity=${clarityScore.toFixed(1)}%  Speakers=${speakerCount}`);
    } catch (err: any) {
      console.warn("[Verify] /analyze failed (non-fatal):", err.message);
    }

    // ── Step 1: Download all stored samples once ─────────────────────────────
    const storedBuffers: Buffer[] = [];
    for (const url of contact.voicePaths) {
      try {
        storedBuffers.push(await downloadBuffer(url));
      } catch (err: any) {
        console.error("  [Verify] Failed to download stored sample:", err.message);
        storedBuffers.push(Buffer.alloc(0));
      }
    }

    // ── Step 2: Score each stored sample against the live audio ──────────────
    const perSampleScores: number[] = [];

    if (speakerCount > 1) {
      // Multi-speaker path — use /diarize_compare: finds the best-matching speaker
      console.log(`[Verify] Multi-speaker mode (${speakerCount} speakers detected)`);
      for (let sIdx = 0; sIdx < storedBuffers.length; sIdx++) {
        const stored = storedBuffers[sIdx];
        if (stored.length === 0) { perSampleScores.push(0); continue; }
        try {
          const form = new FormData();
          form.append("enrolled", stored,          { filename: "enrolled.wav",  contentType: "audio/wav" });
          form.append("live",     req.file.buffer, { filename: "live.audio",    contentType: "audio/octet-stream" });
          const mlRes = await axios.post(`${ML_BASE}/diarize_compare`, form, {
            headers: form.getHeaders(), maxBodyLength: Infinity, maxContentLength: Infinity, timeout: 180000,
          });
          const score: number = mlRes.data?.best_score ?? 0;
          console.log(`  sample[${sIdx}] diarize_compare best_score=${score.toFixed(4)}  spk_scores=${JSON.stringify(mlRes.data?.speaker_scores ?? {})}`);
          perSampleScores.push(score);
        } catch (err: any) {
          console.error(`  sample[${sIdx}] diarize_compare error:`, err.message);
          perSampleScores.push(0);
        }
      }
    } else {
      // Single-speaker path — existing chunk-based /compare logic
      const chunks = await splitIntoChunks(req.file.buffer);
      console.log(`[Verify] Single-speaker mode | ${chunks.length} chunk(s) of ~${CHUNK_SECONDS}s`);
      for (let sIdx = 0; sIdx < storedBuffers.length; sIdx++) {
        const stored = storedBuffers[sIdx];
        if (stored.length === 0) { perSampleScores.push(0); continue; }
        const chunkScores: number[] = [];
        for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
          try {
            const form = new FormData();
            form.append("file1", stored,       { filename: "stored.wav",      contentType: "audio/wav" });
            form.append("file2", chunks[cIdx], { filename: `chunk_${cIdx}.wav`, contentType: "audio/wav" });
            const mlRes = await axios.post(`${ML_BASE}/compare`, form, {
              headers: form.getHeaders(), maxBodyLength: Infinity, maxContentLength: Infinity, timeout: 120000,
            });
            const score: number = mlRes.data?.score ?? 0;
            chunkScores.push(score);
            console.log(`  sample[${sIdx}] chunk[${cIdx}] score=${score.toFixed(4)}`);
          } catch (err: any) {
            console.error(`  sample[${sIdx}] chunk[${cIdx}] error:`, err.message);
            chunkScores.push(0);
          }
        }
        const avg = chunkScores.length > 0 ? chunkScores.reduce((a, b) => a + b, 0) / chunkScores.length : 0;
        console.log(`  sample[${sIdx}] avg=${avg.toFixed(4)}`);
        perSampleScores.push(avg);
      }
    }

    // ── Step 3: Final decision ────────────────────────────────────────────────
    const bestScore  = Math.max(...perSampleScores);
    const authorized = bestScore >= THRESHOLD;
    const scorePct   = Math.round(bestScore * 100);

    console.log(`[Verify] bestScore=${bestScore.toFixed(4)} (${scorePct}%) → ${authorized ? "AUTHORIZED" : "REJECTED"}`);

    contact.verificationAccuracy = scorePct;
    await contact.save();

    // ── Step 4: Persist CallLog ───────────────────────────────────────────────
    const agentId    = (req as any).user?.id ?? (req as any).user?._id ?? null;
    const prisonerId = contact.prisoner ?? null;

    const noiseLabel   = snrDb >= 20 ? "Low noise"   : snrDb >= 10 ? "Moderate noise" : "High noise";
    const clarityLabel = clarityScore >= 70 ? "Clear" : clarityScore >= 40 ? "Fair"   : "Unclear";
    const multiLabel   = speakerCount > 1 ? ` | ${speakerCount} speakers detected` : "";
    const baseNote     = authorized
      ? `Voice verified — score ${(bestScore * 100).toFixed(1)}%`
      : `⚠️ Unauthorized voice — score ${(bestScore * 100).toFixed(1)}% (threshold ${THRESHOLD * 100}%)`;
    const qualityNote  = ` | ${noiseLabel} (${snrDb.toFixed(1)} dB) | ${clarityLabel} voice (${clarityScore.toFixed(1)}%)${multiLabel}`;

    try {
      await CallLog.create({
        sessionId: `VOICE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        agent:    agentId,
        prisoner: prisonerId,
        contact:  contact._id,
        date:     new Date(),
        durationSeconds:    speakerCount > 1
          ? Math.round((speakerSegments as any[]).reduce((t: number, s: any) => t + (s.end - s.start), 0))
          : Math.ceil(req.file.buffer.length / (16000 * 2)),
        verificationResult: authorized ? "Verified" : "Failed",
        similarityScore:    scorePct,
        notes:              baseNote + qualityNote,
        noiseLevel:         Math.round(snrDb * 10) / 10,
        clarityScore:       Math.round(clarityScore * 10) / 10,
        speakerCount:       speakerCount,
      });
    } catch (logErr: any) {
      console.error("[Verify] CallLog save failed:", logErr.message, logErr.errors ?? "");
    }

    res.status(200).json({
      message: "Voice verification completed",
      result: {
        authorized,
        score:          bestScore,
        scorePct,
        samplesChecked: contact.voicePaths.length,
        contactId,
        // Audio quality metrics
        audioQuality: {
          snrDb:          Math.round(snrDb       * 10) / 10,
          clarityScore:   Math.round(clarityScore * 10) / 10,
          speakerCount,
          noiseLabel,
          clarityLabel,
          speakerSegments,
        },
      },
    });
  } catch (err: any) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ message: "Failed to verify voice", error: err.message });
  }
}

import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../middleware/auth";
import { writeLimiter } from "../config/rateLimiter";
import { enrollVoice, verifyVoice, deleteVoiceSample, analyzeAudio } from "../controllers/voice.controller";

const router = Router();

const ALLOWED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".webm"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB — supports up to ~10-min calls
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype.startsWith("audio/") || !ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  },
});

// ENROLL
router.post(
  "/enroll",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("audio"),
  enrollVoice
);

// VERIFY
router.post(
  "/verify",
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("audio"),
  verifyVoice
);

// DELETE a single voice sample from a contact
router.delete(
  "/sample",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  deleteVoiceSample
);

// ANALYZE — audio quality check (SNR, clarity, speaker count)
router.post(
  "/analyze",
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("audio"),
  analyzeAudio
);

export default router;
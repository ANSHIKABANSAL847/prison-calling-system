import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../middleware/auth";
import { writeLimiter } from "../config/rateLimiter";
import {
  enrollMultipleVoices,
  verifyVoiceAdvanced,
  analyzeSpeakers,
} from "../controllers/voice.controller";

const router = Router();

const ALLOWED_AUDIO_EXTENSIONS = new Set([
  ".mp3", ".wav", ".ogg", ".m4a", ".webm"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype.startsWith("audio/") || !ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  },
});

// MULTI ENROLL
router.post(
  "/enroll-multiple",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  upload.array("samples", 30),
  enrollMultipleVoices
);

// ADVANCED VERIFY
router.post(
  "/verify-advanced",
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("file"),
  verifyVoiceAdvanced
);

// ANALYZE
router.post(
  "/analyze-speakers",
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("audio"),
  analyzeSpeakers
);

export default router;
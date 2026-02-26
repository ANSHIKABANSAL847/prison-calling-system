import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../middleware/auth";
import { writeLimiter } from "../config/rateLimiter";
import { enrollVoice } from "../controllers/voice.controller";

const router = Router();

const ALLOWED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".webm"]);

// Memory storage — buffer is streamed directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype.startsWith("audio/") || !ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
      return cb(new Error("Only audio files (.mp3, .wav, .ogg, .m4a, .webm) are allowed"));
    }
    cb(null, true);
  },
});

// FINAL ROUTE
router.post(
  "/enroll",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("audio"),
  enrollVoice
);

export default router;
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { authenticate, authorize } from "../middleware/auth";
import { enrollVoice } from "../controllers/voice.controller";

const router = Router();

// Ensure folder exists
const VOICE_DIR = "uploads/voices";
if (!fs.existsSync(VOICE_DIR)) {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: VOICE_DIR,
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  },
});

// FINAL ROUTE
router.post(
  "/enroll",
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("audio"),
  enrollVoice
);

export default router;
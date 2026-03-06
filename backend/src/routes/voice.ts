import { Router } from "express";
import multer from "multer";
import {
  enrollMultipleVoices,
  verifyVoiceAdvanced,
  analyzeSpeakers,
} from "../controllers/voice.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    console.log("Incoming file:", file.originalname, file.mimetype);

    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files allowed"));
    }
  },
});

// MULTI ENROLL
router.post(
  "/extract_speakers",
  upload.array("samples", 30),
  enrollMultipleVoices
);

// VERIFY
router.post(
  "/verify-advanced",
  upload.single("file"),
  (req, res, next) => {
    console.log("=== ROUTE LEVEL LOG ===");
    console.log("BODY BEFORE CONTROLLER:", req.body);
    console.log("FILE BEFORE CONTROLLER:", req.file);
    next();
  },
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
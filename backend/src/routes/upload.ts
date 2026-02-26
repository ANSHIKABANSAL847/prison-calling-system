import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../middleware/auth";
import { writeLimiter } from "../config/rateLimiter";
import { uploadPhoto } from "../controllers/upload.controller";

const router = Router();

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

// Memory storage — buffer is passed directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype.startsWith("image/") || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return cb(new Error("Only image files (.jpg, .jpeg, .png, .gif, .webp) are allowed"));
    }
    cb(null, true);
  },
});

// POST /api/upload/photo — Upload a single photo to Cloudinary
router.post(
  "/photo",
  writeLimiter,
  authenticate,
  authorize("Admin", "Jailer"),
  upload.single("photo"),
  uploadPhoto
);

export default router;

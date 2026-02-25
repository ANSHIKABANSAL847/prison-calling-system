import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth";
import { writeLimiter } from "../config/rateLimiter";
import { uploadPhoto } from "../controllers/upload.controller";

const router = Router();

// Memory storage — buffer is passed directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
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

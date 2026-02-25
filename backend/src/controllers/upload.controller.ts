import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";

export async function uploadPhoto(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file provided" });
      return;
    }

    // Upload buffer to Cloudinary
    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "pics/photos",
            resource_type: "image",
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file!.buffer);
      }
    );

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload image" });
  }
}

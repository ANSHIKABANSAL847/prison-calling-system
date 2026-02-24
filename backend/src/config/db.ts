import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.DB_URL;

  if (!uri) {
    throw new Error("DB_URL is not defined in environment variables");
  }

  try {
    await mongoose.connect(uri, {
      dbName: "pics",
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

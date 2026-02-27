import mongoose, { Schema, Document, Types } from "mongoose";

// ──────────────────────────────────────
// Interface
// ──────────────────────────────────────
export interface ICallLog extends Document {
  sessionId: string;
  agent: Types.ObjectId;         // ref User
  prisoner: Types.ObjectId;      // ref Prisoner
  contact: Types.ObjectId;       // ref Contact
  date: Date;
  durationSeconds: number;       // e.g. 755 → "12:35"
  verificationResult: "Verified" | "Failed" | "Pending";
  similarityScore: number;       // 0-100
  audioUrl?: string;             // optional stored audio
  notes?: string;
  // Audio quality metrics
  noiseLevel?: number;           // SNR in dB (higher = less noise)
  clarityScore?: number;         // 0-100 (higher = clearer voice)
  speakerCount?: number;         // number of detected speakers in the audio
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────────────
// Schema
// ──────────────────────────────────────

const callLogSchema = new Schema<ICallLog>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    prisoner: {
      type: Schema.Types.ObjectId,
      ref: "Prisoner",
      required: false,
      default: null,
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: false,
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    verificationResult: {
      type: String,
      enum: ["Verified", "Failed", "Pending"],
      required: true,
    },
    similarityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    audioUrl: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    noiseLevel: {
      type: Number,
      default: null,
    },
    clarityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    speakerCount: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common filter queries
callLogSchema.index({ agent: 1 });
callLogSchema.index({ prisoner: 1 });
callLogSchema.index({ contact: 1 });
callLogSchema.index({ verificationResult: 1 });
callLogSchema.index({ date: -1 });

export default mongoose.model<ICallLog>("CallLog", callLogSchema);

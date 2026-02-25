import mongoose, { Schema, Document, Types } from "mongoose";

// ──────────────────────────────────────
// Interface
// ──────────────────────────────────────
export interface ICallLog extends Document {
  sessionId: string;
  agent: Types.ObjectId;         // ref User
  prisoner: Types.ObjectId;      // ref Prisoner
  contact: Types.ObjectId;       // ref Contact
  channel: "Phone" | "Video Call" | "Chat";
  date: Date;
  durationSeconds: number;       // e.g. 755 → "12:35"
  verificationResult: "Verified" | "Failed" | "Pending";
  similarityScore: number;       // 0-100
  audioUrl?: string;             // optional stored audio
  notes?: string;
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
      required: true,
    },
    prisoner: {
      type: Schema.Types.ObjectId,
      ref: "Prisoner",
      required: true,
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    channel: {
      type: String,
      enum: ["Phone", "Video Call", "Chat"],
      required: true,
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
callLogSchema.index({ channel: 1 });

export default mongoose.model<ICallLog>("CallLog", callLogSchema);

import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICallLog extends Document {
  sessionId: string;
  agent: Types.ObjectId;
  prisoner: Types.ObjectId;
  date: Date;
  durationSeconds: number;
  verificationResult: "Verified" | "Failed";
  similarityScore: number;
  speakerCount?: number;
  unknownSpeakers?: number;
  riskLevel?: string;
  emotion?: string;
  transcript?: string;
  threatDetected?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const callLogSchema = new Schema<ICallLog>(
  {
    sessionId: { type: String, required: true, unique: true },
    agent: { type: Schema.Types.ObjectId, ref: "User" },
    prisoner: { type: Schema.Types.ObjectId, ref: "Prisoner" },
    date: { type: Date, required: true },
    durationSeconds: { type: Number, default: 0 },
    verificationResult: {
      type: String,
      enum: ["Verified", "Failed", "Pending"],
      required: true,
    },
    similarityScore: { type: Number, min: 0, max: 100 },
    speakerCount: { type: Number },
    unknownSpeakers: { type: Number },
    emotion: {
      type: String,
      default: "neutral"
    },
    transcript: {
      type: String,
      default: ""
    },
    threatDetected: {
      type: Boolean,
      default: false
    },
    riskLevel: {
      type: String,
      default: "low"
    }
  },

  { timestamps: true }
);

export default mongoose.model<ICallLog>("CallLog", callLogSchema);
import mongoose, { Schema, Document } from "mongoose";

export interface IPrisoner extends Document {
  prisonerId: number;
  fullName: string;
  dateOfBirth: Date;
  gender: "Male" | "Female" | "Other";
  photo: string;
  aadhaarNumber?: string;
  caseNumber: string;
  prisonName: string;
  sentenceYears: number;
  riskTags: string[];

  // Voice System
  voicePaths: string[];
  voiceSamples: number;
  isVoiceEnrolled: boolean;
  verificationPercent: number;
  lastVerificationDate?: Date;

  totalCallsMonitored: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const prisonerSchema = new Schema<IPrisoner>(
  {
    prisonerId: { type: Number, required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    photo: { type: String, required: true },
    aadhaarNumber: { type: String, unique: true, sparse: true },
    caseNumber: { type: String, required: true },
    prisonName: { type: String, required: true },
    sentenceYears: { type: Number, required: true },
    riskTags: { type: [String], default: [] },

    // 🔥 Voice
    voicePaths: { type: [String], default: [] },
    voiceSamples: { type: Number, default: 0 },
    isVoiceEnrolled: { type: Boolean, default: false },
    verificationPercent: { type: Number, default: 0 },
    lastVerificationDate: { type: Date },

    totalCallsMonitored: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPrisoner>("Prisoner", prisonerSchema);
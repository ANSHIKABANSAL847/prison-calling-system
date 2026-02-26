import mongoose, { Schema, Document, Types } from "mongoose";

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
  riskTags: (
    | "High Risk"
    | "Escape Risk"
    | "Violent Offender"
    | "Gang Affiliated"
    | "Good Conduct"
  )[];
  voicePath?: string;       // Cloudinary URL of enrolled prisoner voice
  voiceSamples: number;     // Number of voice samples enrolled
  verificationPercent: number;
  totalCallsMonitored: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const prisonerSchema = new Schema<IPrisoner>(
  {
    prisonerId: {
      type: Number,
      required: [true, "Prisoner ID is required"],
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },
    photo: {
      type: String,
      required: [true, "Photo is required"],
    },
    aadhaarNumber: {
      type: String,
      unique: true,
      trim: true,
      match: [/^\d{12}$/, "Aadhaar number must be exactly 12 digits"],
      sparse: true,
    },
    caseNumber: {
      type: String,
      required: [true, "Case number is required"],
      trim: true,
    },
    prisonName: {
      type: String,
      required: [true, "Prison name is required"],
      trim: true,
    },
    sentenceYears: {
      type: Number,
      required: [true, "Sentence duration is required"],
      min: [0, "Sentence cannot be negative"],
    },
    riskTags: {
      type: [String],
      enum: [
        "High Risk",
        "Escape Risk",
        "Violent Offender",
        "Gang Affiliated",
        "Good Conduct",
      ],
      default: [],
    },
    verificationPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalCallsMonitored: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    voicePath: {
      type: String,
      default: null,
    },
    voiceSamples: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

prisonerSchema.index({ prisonName: 1 });
prisonerSchema.index({ caseNumber: 1 });
prisonerSchema.index({ riskTags: 1 });

prisonerSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
});

prisonerSchema.set("toJSON", { virtuals: true });
prisonerSchema.set("toObject", { virtuals: true });

const Prisoner =
  mongoose.models.Prisoner ||
  mongoose.model<IPrisoner>("Prisoner", prisonerSchema);

export default Prisoner;

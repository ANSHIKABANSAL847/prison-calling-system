import mongoose, { Schema, Document, Types } from "mongoose";

export interface IContact extends Document {
  prisoner: Types.ObjectId;
  contactName: string;
  relation:
    | "Wife"
    | "Husband"
    | "Father"
    | "Mother"
    | "Brother"
    | "Sister"
    | "Son"
    | "Daughter"
    | "Lawyer"
    | "Friend"
    | "Other";
  phoneNumber: string;
  photo?: string;
  isVerified: boolean;

  // Voice fields
  voicePaths: string[];          // Cloudinary URLs of all enrolled voice samples
  voiceSamples: number;          // Number of samples (= voicePaths.length)
  verificationAccuracy: number;  // Last verification score (0–100)

  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    prisoner: {
      type: Schema.Types.ObjectId,
      ref: "Prisoner",
      required: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    relation: {
      type: String,
      enum: [
        "Wife","Husband","Father","Mother","Brother","Sister",
        "Son","Daughter","Lawyer","Friend","Other",
      ],
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?\d{10,15}$/, "Enter a valid phone number"],
    },
    photo: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Voice
    voicePaths: {
      type: [String],
      default: [],
    },
    voiceSamples: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificationAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// Phone number must be globally unique across all contacts
contactSchema.index({ phoneNumber: 1 }, { unique: true });

export default mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", contactSchema);
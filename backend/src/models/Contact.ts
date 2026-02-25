import mongoose, { Schema, Document, Types } from "mongoose";

// ──────────────────────────────────────
// Interface
// ──────────────────────────────────────
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
  voiceSamples: number;
  verificationAccuracy: number;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────────────
// Schema
// ──────────────────────────────────────
const contactSchema = new Schema<IContact>(
  {
    prisoner: {
      type: Schema.Types.ObjectId,
      ref: "Prisoner",
      required: [true, "Prisoner reference is required"],
    },
    contactName: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    relation: {
      type: String,
      enum: [
        "Wife",
        "Husband",
        "Father",
        "Mother",
        "Brother",
        "Sister",
        "Son",
        "Daughter",
        "Lawyer",
        "Friend",
        "Other",
      ],
      required: [true, "Relation is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
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
  {
    timestamps: true,
  }
);

// ──────────────────────────────────────
// Indexes
// ──────────────────────────────────────
contactSchema.index({ prisoner: 1 });
contactSchema.index({ phoneNumber: 1 });
contactSchema.index({ prisoner: 1, phoneNumber: 1 }, { unique: true });

// ──────────────────────────────────────
// Model
// ──────────────────────────────────────
const Contact =
  mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", contactSchema);

export default Contact;

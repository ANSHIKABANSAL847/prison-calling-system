import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

// ──────────────────────────────────────
// Interface
// ──────────────────────────────────────
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "Admin" | "Jailer";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ──────────────────────────────────────
// Schema
// ──────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["Admin", "Jailer"],
      required: [true, "Role is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ──────────────────────────────────────
// Pre-save: hash password
// ──────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ──────────────────────────────────────
// Method: compare password
// ──────────────────────────────────────
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ──────────────────────────────────────
// Index
// ──────────────────────────────────────
userSchema.index({ role: 1 });

const User = mongoose.model<IUser>("User", userSchema);

export default User;

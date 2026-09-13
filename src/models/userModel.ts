import mongoose, { Schema, type Model } from "mongoose";
import { allRoles, roles, userStatus } from "@/constants";

export interface UserDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: string;
  status: string;
  /** Dev/test account — its activity is isolated from real admins (test sandbox). */
  isDev?: boolean;
  lastLoginAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: allRoles,
      required: true,
      default: roles.technician,
    },
    status: {
      type: String,
      enum: Object.values(userStatus),
      required: true,
      default: userStatus.active,
    },
    isDev: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

export const userModel: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) ||
  mongoose.model<UserDocument>("User", userSchema);

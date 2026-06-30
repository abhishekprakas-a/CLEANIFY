import mongoose, { Schema, type Model } from "mongoose";

export interface RoleDocument {
  _id: mongoose.Types.ObjectId;
  name: string; // "admin" | "technician"
  description: string;
  permissions: string[]; // permission keys
  isSystem: boolean; // system roles cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<RoleDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const roleModel: Model<RoleDocument> =
  (mongoose.models.Role as Model<RoleDocument>) ||
  mongoose.model<RoleDocument>("Role", roleSchema);

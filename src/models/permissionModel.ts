import mongoose, { Schema, type Model } from "mongoose";

export interface PermissionDocument {
  _id: mongoose.Types.ObjectId;
  key: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<PermissionDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

export const permissionModel: Model<PermissionDocument> =
  (mongoose.models.Permission as Model<PermissionDocument>) ||
  mongoose.model<PermissionDocument>("Permission", permissionSchema);

import mongoose, { Schema, type Model } from "mongoose";
import { approvalStatus, photoKind } from "@/constants";

export interface PhotoMetadata {
  contentType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  originalName?: string;
  geo?: { lat: number; lng: number };
}

export interface PhotoDocument {
  _id: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  photoType: string; // before | after
  photoUrl: string;
  s3Key: string;
  uploadedBy: mongoose.Types.ObjectId;
  approvalStatus: string;
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  metadata: PhotoMetadata;
  createdAt: Date; // = timestamp
  updatedAt: Date;
}

const metadataSchema = new Schema<PhotoMetadata>(
  {
    contentType: { type: String, required: true },
    sizeBytes: { type: Number },
    width: { type: Number },
    height: { type: Number },
    originalName: { type: String },
    geo: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { _id: false },
);

const photoSchema = new Schema<PhotoDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    photoType: { type: String, enum: Object.values(photoKind), required: true },
    photoUrl: { type: String, required: true },
    s3Key: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvalStatus: {
      type: String,
      enum: Object.values(approvalStatus),
      default: approvalStatus.pending,
    },
    rejectionReason: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    metadata: { type: metadataSchema, required: true },
  },
  { timestamps: true },
);

photoSchema.index({ jobId: 1, photoType: 1 });
photoSchema.index({ approvalStatus: 1 });

export const photoModel: Model<PhotoDocument> =
  (mongoose.models.Photo as Model<PhotoDocument>) ||
  mongoose.model<PhotoDocument>("Photo", photoSchema);

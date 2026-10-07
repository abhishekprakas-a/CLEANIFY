import mongoose, { Schema, type Model } from "mongoose";
import { allLateRequestStatuses, lateRequestStatus } from "@/constants";

/**
 * A "running late" request raised by a technician/supervisor. Optionally tied to
 * a specific job. An admin reviews it (acknowledges, with an optional note).
 */
export interface LateRequestDocument {
  _id: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  /** Set when the request is about a specific job/site; absent for a general one. */
  jobId?: mongoose.Types.ObjectId;
  reason: string;
  status: string; // pending | acknowledged
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  adminNote?: string;
  /** Raised by a dev/test account — hidden from real admins (test sandbox). */
  isDev?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lateRequestSchema = new Schema<LateRequestDocument>(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", index: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: allLateRequestStatuses,
      required: true,
      default: lateRequestStatus.pending,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    adminNote: { type: String, trim: true },
    isDev: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Admin queue: realm-scoped, pending first, recent first.
lateRequestSchema.index({ isDev: 1, status: 1, createdAt: -1 });

export const lateRequestModel: Model<LateRequestDocument> =
  (mongoose.models.LateRequest as Model<LateRequestDocument>) ||
  mongoose.model<LateRequestDocument>("LateRequest", lateRequestSchema);

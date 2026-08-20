import mongoose, { Schema, type Model } from "mongoose";
import {
  allSubmissionStatuses,
  allSubmissionTypes,
  submissionStatus,
} from "@/constants";

/**
 * A field-evidence submission: a technician bundles photos + a details form for
 * either the pre-work check (C5) or completion (C8). An approver (admin or the
 * job's supervisor) approves or declines it; approval gates the job lifecycle.
 */
export interface JobSubmissionDocument {
  _id: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  type: string; // preWork | completion
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  photos: mongoose.Types.ObjectId[];
  /** Free-form details form (checklist answers, notes) — shape varies by type. */
  details?: Record<string, unknown>;
  status: string; // pending | approved | declined
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  declineReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobSubmissionSchema = new Schema<JobSubmissionDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    type: { type: String, enum: allSubmissionTypes, required: true },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedAt: { type: Date, required: true, default: () => new Date() },
    photos: [{ type: Schema.Types.ObjectId, ref: "Photo" }],
    details: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: allSubmissionStatuses,
      required: true,
      default: submissionStatus.pending,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    declineReason: { type: String, trim: true },
  },
  { timestamps: true },
);

// Approvals queue (pending first, recent first) + per-job lookups.
jobSubmissionSchema.index({ status: 1, createdAt: -1 });
jobSubmissionSchema.index({ jobId: 1, type: 1, createdAt: -1 });

export const jobSubmissionModel: Model<JobSubmissionDocument> =
  (mongoose.models.JobSubmission as Model<JobSubmissionDocument>) ||
  mongoose.model<JobSubmissionDocument>("JobSubmission", jobSubmissionSchema);

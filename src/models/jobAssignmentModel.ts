import mongoose, { Schema, type Model } from "mongoose";
import { allAssignmentStatuses, assignmentStatus } from "@/constants";

/**
 * One record per technician↔job assignment. Reassigning a job marks the current
 * assignment `reassigned` and creates a new `active` one, so the full assignment
 * history of a job is preserved.
 */
export interface JobAssignmentDocument {
  _id: mongoose.Types.ObjectId;
  job: mongoose.Types.ObjectId;
  technician: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  scheduledDate: Date;
  scheduledTime?: string;
  status: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobAssignmentSchema = new Schema<JobAssignmentDocument>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    technician: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedAt: { type: Date, required: true, default: () => new Date() },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String },
    status: {
      type: String,
      enum: allAssignmentStatuses,
      default: assignmentStatus.active,
    },
    note: { type: String },
  },
  { timestamps: true },
);

jobAssignmentSchema.index({ job: 1, status: 1 });
jobAssignmentSchema.index({ technician: 1, scheduledDate: 1, status: 1 });

export const jobAssignmentModel: Model<JobAssignmentDocument> =
  (mongoose.models.JobAssignment as Model<JobAssignmentDocument>) ||
  mongoose.model<JobAssignmentDocument>("JobAssignment", jobAssignmentSchema);

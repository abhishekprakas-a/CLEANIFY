import mongoose, { Schema, type Model } from "mongoose";
import { allJobStatuses, jobStatus, paymentStatus, slot } from "@/constants";
import { tankEntrySchema, type TankEntryDocument } from "./tankSchema";

export interface JobStatusEventDocument {
  status: string;
  at: Date;
  by: mongoose.Types.ObjectId;
  note?: string;
}

export interface JobDocument {
  _id: mongoose.Types.ObjectId;
  jobCode: string;
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  assignedTechnicians: mongoose.Types.ObjectId[];
  /** One of `assignedTechnicians`, designated as the on-site supervisor. */
  supervisor?: mongoose.Types.ObjectId;
  serviceType: string;
  workName?: string;
  tanks: TankEntryDocument[];
  totalCharge?: number;
  googleMapLocation?: string;
  landmark?: string;
  scheduledDate?: Date;
  scheduledTime?: string; // HH:mm
  scheduledSlot?: string; // legacy morning/afternoon/evening
  /** Estimated on-site duration in minutes — drives end-time + conflict math. */
  estimatedDurationMins?: number;
  status: string;
  statusHistory: JobStatusEventDocument[];
  startedAt?: Date;
  completedAt?: Date;
  /** When this job was created by rescheduling another, the original's id. */
  rescheduledFromJobId?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  beforePhotos: mongoose.Types.ObjectId[];
  afterPhotos: mongoose.Types.ObjectId[];
  completionNotes?: string;
  priceFinal?: number;
  paymentStatus?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const statusEventSchema = new Schema<JobStatusEventDocument>(
  {
    status: { type: String, enum: allJobStatuses, required: true },
    at: { type: Date, required: true, default: () => new Date() },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String },
  },
  { _id: false },
);

const jobSchema = new Schema<JobDocument>(
  {
    jobCode: { type: String, required: true, unique: true },
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    assignedTechnicians: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    supervisor: { type: Schema.Types.ObjectId, ref: "User" },
    serviceType: { type: String, default: "waterTank" },
    workName: { type: String, trim: true },
    googleMapLocation: { type: String, trim: true },
    landmark: { type: String, trim: true },
    tanks: { type: [tankEntrySchema], default: [] },
    totalCharge: { type: Number, min: 0 },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    scheduledSlot: { type: String, enum: Object.values(slot) },
    estimatedDurationMins: { type: Number, min: 0 },
    status: {
      type: String,
      enum: allJobStatuses,
      required: true,
      default: jobStatus.pending,
    },
    statusHistory: { type: [statusEventSchema], default: [] },
    startedAt: { type: Date },
    completedAt: { type: Date },
    rescheduledFromJobId: { type: Schema.Types.ObjectId, ref: "Job" },
    cancellationReason: { type: String, trim: true },
    beforePhotos: [{ type: Schema.Types.ObjectId, ref: "Photo" }],
    afterPhotos: [{ type: Schema.Types.ObjectId, ref: "Photo" }],
    completionNotes: { type: String },
    priceFinal: { type: Number, min: 0 },
    paymentStatus: {
      type: String,
      enum: Object.values(paymentStatus),
      default: paymentStatus.unpaid,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

jobSchema.index({ assignedTechnicians: 1, status: 1 });
jobSchema.index({ assignedTechnicians: 1, scheduledDate: 1 });
jobSchema.index({ scheduledDate: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ status: 1, completedAt: 1 }); // completion / productivity reports
jobSchema.index({ createdAt: -1 }); // dashboard 7-day trend + recency sorts

export const jobModel: Model<JobDocument> =
  (mongoose.models.Job as Model<JobDocument>) ||
  mongoose.model<JobDocument>("Job", jobSchema);

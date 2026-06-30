import mongoose, { Schema, type Model } from "mongoose";
import { allSatisfactionStatuses } from "@/constants";

export interface ReviewDocument {
  _id: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  technicianId?: mongoose.Types.ObjectId;
  starRating: number;
  reviewComment?: string;
  satisfactionStatus: string;
  reviewDate: Date;
  collectedBy?: mongoose.Types.ObjectId;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    technicianId: { type: Schema.Types.ObjectId, ref: "User" },
    starRating: { type: Number, required: true, min: 1, max: 5 },
    reviewComment: { type: String, trim: true },
    satisfactionStatus: {
      type: String,
      enum: allSatisfactionStatuses,
      required: true,
    },
    reviewDate: { type: Date, required: true, default: () => new Date() },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    source: { type: String },
  },
  { timestamps: true },
);

reviewSchema.index({ technicianId: 1 });
reviewSchema.index({ starRating: 1 });
reviewSchema.index({ satisfactionStatus: 1 });
reviewSchema.index({ reviewDate: -1 }); // review reports + recent feed

export const reviewModel: Model<ReviewDocument> =
  (mongoose.models.Review as Model<ReviewDocument>) ||
  mongoose.model<ReviewDocument>("Review", reviewSchema);

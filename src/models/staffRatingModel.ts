import mongoose, { Schema, type Model } from "mongoose";

/**
 * An internal rating of a staff member's work on a job (C9), separate from the
 * customer's review. Captured at close time — one per worker/supervisor per job.
 */
export interface StaffRatingDocument {
  _id: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  staffUserId: mongoose.Types.ObjectId;
  rating: number; // 1..5
  remark?: string;
  ratedBy: mongoose.Types.ObjectId;
  ratedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffRatingSchema = new Schema<StaffRatingDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    staffUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    remark: { type: String, trim: true },
    ratedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ratedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

// One rating per staff member per job; per-staff aggregation for profiles.
staffRatingSchema.index({ jobId: 1, staffUserId: 1 }, { unique: true });
staffRatingSchema.index({ staffUserId: 1 });

export const staffRatingModel: Model<StaffRatingDocument> =
  (mongoose.models.StaffRating as Model<StaffRatingDocument>) ||
  mongoose.model<StaffRatingDocument>("StaffRating", staffRatingSchema);

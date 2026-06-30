import mongoose, { Schema, type Model } from "mongoose";

/** A device's Web Push subscription, tied to a user. */
export interface PushSubscriptionDocument {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true },
);

export const pushSubscriptionModel: Model<PushSubscriptionDocument> =
  (mongoose.models.PushSubscription as Model<PushSubscriptionDocument>) ||
  mongoose.model<PushSubscriptionDocument>(
    "PushSubscription",
    pushSubscriptionSchema,
  );

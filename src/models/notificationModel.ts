import mongoose, { Schema, type Model } from "mongoose";
import { allNotificationTypes } from "@/constants";

/** An in-app notification (C6) shown in the topbar bell + drives sidebar badges. */
export interface NotificationDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: string;
  jobId?: mongoose.Types.ObjectId;
  message: string;
  /** Deep link to open when the notification is clicked. */
  url?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: allNotificationTypes, required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    message: { type: String, required: true },
    url: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Bell query: a user's notifications, unread first, recent first.
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const notificationModel: Model<NotificationDocument> =
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>("Notification", notificationSchema);

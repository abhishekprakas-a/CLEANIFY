import mongoose, { Schema, type Model } from "mongoose";
import { allBookingStatuses, bookingStatus } from "@/constants";
import { tankEntrySchema, type TankEntryDocument } from "./tankSchema";

export interface BookingStatusEventDocument {
  status: string;
  at: Date;
  by: mongoose.Types.ObjectId;
  note?: string;
}

export interface BookingDocument {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  tanks: TankEntryDocument[];
  totalCharge?: number;
  scheduledDate: Date;
  scheduledTime?: string; // HH:mm
  specialInstructions?: string;
  bookingStatus: string;
  statusHistory: BookingStatusEventDocument[];
  cancellationReason?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const statusEventSchema = new Schema<BookingStatusEventDocument>(
  {
    status: { type: String, enum: allBookingStatuses, required: true },
    at: { type: Date, required: true, default: () => new Date() },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String },
  },
  { _id: false },
);

const bookingSchema = new Schema<BookingDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    tanks: {
      type: [tankEntrySchema],
      required: true,
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
        message: "At least one tank is required",
      },
    },
    totalCharge: { type: Number, min: 0 },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String },
    specialInstructions: { type: String, trim: true },
    bookingStatus: {
      type: String,
      enum: allBookingStatuses,
      default: bookingStatus.pending,
      index: true,
    },
    statusHistory: { type: [statusEventSchema], default: [] },
    cancellationReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

bookingSchema.index({ bookingStatus: 1, scheduledDate: 1 });
bookingSchema.index({ createdAt: -1 });

export const bookingModel: Model<BookingDocument> =
  (mongoose.models.Booking as Model<BookingDocument>) ||
  mongoose.model<BookingDocument>("Booking", bookingSchema);

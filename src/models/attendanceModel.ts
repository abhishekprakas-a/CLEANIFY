import mongoose, { Schema, type Model } from "mongoose";
import { allAttendanceStatuses, attendanceStatus } from "@/constants";

export interface GeoLocationPair {
  checkIn?: { lat: number; lng: number };
  checkOut?: { lat: number; lng: number };
}

export interface AttendanceDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD local day key
  checkInTime: Date;
  checkOutTime?: Date;
  workingHours?: number; // decimal hours, set on check-out
  status: string; // present | late | halfDay (absent is derived in reports)
  geoLocation?: GeoLocationPair;
  createdAt: Date;
  updatedAt: Date;
}

const geoSchema = new Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false },
);

const attendanceSchema = new Schema<AttendanceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
    workingHours: { type: Number, min: 0 },
    status: {
      type: String,
      enum: allAttendanceStatuses,
      required: true,
      default: attendanceStatus.present,
    },
    geoLocation: {
      checkIn: { type: geoSchema },
      checkOut: { type: geoSchema },
    },
  },
  { timestamps: true },
);

// One attendance record per user per day (prevents duplicate check-in).
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

export const attendanceModel: Model<AttendanceDocument> =
  (mongoose.models.Attendance as Model<AttendanceDocument>) ||
  mongoose.model<AttendanceDocument>("Attendance", attendanceSchema);

import { z } from "zod";
import { geoSchema } from "./customerSchema";

/** The device's current location at check-in / check-out (optional). */
export const checkInSchema = z.object({
  location: geoSchema.optional(),
});

export const checkOutSchema = z.object({
  location: geoSchema.optional(),
});

/** Admin report query: period + an anchor date (defaults to today server-side). */
export const attendanceReportSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  userId: z.string().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type AttendanceReportInput = z.infer<typeof attendanceReportSchema>;

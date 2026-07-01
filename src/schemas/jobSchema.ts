import { z } from "zod";
import { allJobStatuses, calendarView } from "@/constants";
import { tankEntrySchema } from "./bookingSchema";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm")
  .optional()
  .or(z.literal(""));

/** Create a job from an existing booking (starts `pending`). */
export const createJobSchema = z.object({
  booking: z.string().min(1, "Booking is required"),
  scheduledDate: z.coerce.date().optional(),
  scheduledTime: timeSchema,
});

/**
 * Unified "Job Card" intake — creates customer (if new) + booking + job in one
 * step. `customer.id` selects an existing customer; otherwise the inline
 * details create a new one.
 */
export const jobIntakeSchema = z
  .object({
    customer: z.object({
      id: z.string().optional(),
      customerName: z.string().trim().optional(),
      mobileNumber: z.string().trim().optional(),
      address: z.string().trim().optional(),
      googleMapLocation: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    }),
    tanks: z.array(tankEntrySchema).min(1, "Add at least one tank"),
    scheduledDate: z.coerce.date(),
    scheduledTime: timeSchema,
    specialInstructions: z.string().trim().optional(),
    technicianIds: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (v) =>
      Boolean(v.customer.id) ||
      (Boolean(v.customer.customerName) && Boolean(v.customer.mobileNumber)),
    {
      message: "Select an existing customer or enter name and mobile number",
      path: ["customer"],
    },
  );

/** Set/replace the job's date & time → moves a pending job to `scheduled`. */
export const scheduleJobSchema = z.object({
  scheduledDate: z.coerce.date(),
  scheduledTime: timeSchema,
});

/** Assign one or more technicians (with optional date/time) → `assigned`. */
export const assignJobSchema = z.object({
  technicianIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one technician"),
  scheduledDate: z.coerce.date().optional(),
  scheduledTime: timeSchema,
});

/** Replace the job's crew with a different set of technicians. */
export const reassignJobSchema = z.object({
  technicianIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one technician"),
  note: z.string().trim().optional(),
});

/** Change the job's date/time, keeping the technician. */
export const rescheduleJobSchema = z.object({
  scheduledDate: z.coerce.date(),
  scheduledTime: timeSchema,
  note: z.string().trim().optional(),
});

/** Advance the execution workflow (technician/admin). */
export const transitionJobSchema = z.object({
  to: z.enum(allJobStatuses as [string, ...string[]]),
  note: z.string().optional(),
  completionNotes: z.string().optional(),
});

export const cancelJobSchema = z.object({
  reason: z.string().min(1, "A cancellation reason is required"),
});

export const scheduleQuerySchema = z.object({
  view: z
    .enum([calendarView.daily, calendarView.weekly, calendarView.monthly])
    .default(calendarView.daily),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  technicianId: z.string().optional(),
});

export const availabilityQuerySchema = z.object({
  technicianId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobIntakeInput = z.infer<typeof jobIntakeSchema>;
export type ScheduleJobInput = z.infer<typeof scheduleJobSchema>;
export type AssignJobInput = z.infer<typeof assignJobSchema>;
export type ReassignJobInput = z.infer<typeof reassignJobSchema>;
export type RescheduleJobInput = z.infer<typeof rescheduleJobSchema>;
export type TransitionJobInput = z.infer<typeof transitionJobSchema>;
export type CancelJobInput = z.infer<typeof cancelJobSchema>;
export type ScheduleQueryInput = z.infer<typeof scheduleQuerySchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

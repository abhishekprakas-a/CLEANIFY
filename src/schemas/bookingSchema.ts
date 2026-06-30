import { z } from "zod";
import { allTankTypes, allBookingStatuses } from "@/constants";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm")
  .optional()
  .or(z.literal(""));

export const createBookingSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  tankType: z.enum(allTankTypes as [string, ...string[]]),
  tankCapacity: z.coerce.number().int().min(1, "Capacity is required"),
  numberOfTanks: z.coerce.number().int().min(1, "At least one tank"),
  scheduledDate: z.coerce.date(),
  scheduledTime: timeSchema,
  specialInstructions: z.string().trim().optional(),
});

export const updateBookingSchema = createBookingSchema.partial();

export const rescheduleBookingSchema = z.object({
  scheduledDate: z.coerce.date(),
  scheduledTime: timeSchema,
  note: z.string().trim().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(1, "A cancellation reason is required"),
});

export const bookingQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(allBookingStatuses as [string, ...string[]]).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;

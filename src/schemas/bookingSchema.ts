import { z } from "zod";
import { allBookingStatuses, allServiceTypes } from "@/constants";
import { googleMapLocationSchema } from "./customerSchema";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm")
  .optional()
  .or(z.literal(""));

/** Blank inputs ("" from the form) become undefined instead of failing. */
const optionalNumber = (schema: z.ZodTypeAny) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema);

/** One line item in a job/booking (generic across service types). */
export const tankEntrySchema = z.object({
  name: z.string().trim().optional(),
  tankType: z.string().trim().min(1, "Type is required"),
  capacityLitres: optionalNumber(z.coerce.number().int().min(1).optional()),
  quantity: optionalNumber(z.coerce.number().int().min(1).optional()),
  cleaningCharge: optionalNumber(z.coerce.number().min(0).optional()),
  risk: optionalNumber(z.coerce.number().int().min(1).max(10).optional()),
});

export const createBookingSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  serviceType: z
    .enum(allServiceTypes as [string, ...string[]])
    .default("waterTank"),
  workName: z.string().trim().optional(),
  totalCharge: optionalNumber(z.coerce.number().min(0).max(10_000_000).optional()),
  googleMapLocation: googleMapLocationSchema,
  landmark: z.string().trim().optional(),
  tanks: z.array(tankEntrySchema).min(1, "Add at least one item"),
  scheduledDate: z.coerce.date(),
  scheduledTime: timeSchema,
  estimatedDurationMins: optionalNumber(
    z.coerce.number().int().min(15).max(1440).optional(),
  ),
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

export type TankEntryInput = z.infer<typeof tankEntrySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;

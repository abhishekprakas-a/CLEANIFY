/** Type of tank being serviced. */
export const tankType = {
  overhead: "overhead",
  underground: "underground",
  sump: "sump",
  loft: "loft",
  other: "other",
} as const;

export type TankType = (typeof tankType)[keyof typeof tankType];

export const allTankTypes: TankType[] = Object.values(tankType);

/**
 * Booking lifecycle status.
 * - `pending`     — created, awaiting scheduling into a job
 * - `scheduled`   — a job has been created/assigned for this booking
 * - `rescheduled` — date/time changed after it was scheduled
 * - `completed`   — the associated job finished
 * - `cancelled`   — cancelled with a reason
 */
export const bookingStatus = {
  pending: "pending",
  scheduled: "scheduled",
  rescheduled: "rescheduled",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type BookingStatus = (typeof bookingStatus)[keyof typeof bookingStatus];

export const allBookingStatuses: BookingStatus[] = Object.values(bookingStatus);

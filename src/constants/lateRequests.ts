/**
 * Late requests. When a job is running late, a technician/supervisor raises a
 * request with a reason; it reaches the admin for review (acknowledge).
 */
export const lateRequestStatus = {
  pending: "pending",
  acknowledged: "acknowledged",
} as const;

export type LateRequestStatus =
  (typeof lateRequestStatus)[keyof typeof lateRequestStatus];

export const allLateRequestStatuses: LateRequestStatus[] =
  Object.values(lateRequestStatus);

/** Preset reasons offered to the technician (free text also allowed). */
export const lateReasonPresets = [
  "Traffic / travel delay",
  "Previous site overran",
  "Site access delayed",
  "Equipment / machinery issue",
  "Customer not ready on site",
] as const;

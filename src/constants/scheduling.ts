/** Lifecycle of a single assignment record (one technician ↔ one job). */
export const assignmentStatus = {
  active: "active",
  reassigned: "reassigned",
  cancelled: "cancelled",
} as const;

export type AssignmentStatus =
  (typeof assignmentStatus)[keyof typeof assignmentStatus];

export const allAssignmentStatuses: AssignmentStatus[] =
  Object.values(assignmentStatus);

/** Scheduling policy — tune capacity and conflict rules here. */
export const schedulingPolicy = {
  /** Max active jobs a technician may hold on a single day. */
  maxJobsPerDay: 5,
  /** When true, two jobs at the exact same date + time are a hard conflict. */
  blockSameSlot: true,
  /**
   * Minimum gap (minutes) between the end of one job and the start of the next
   * for the same technician — travel/setup buffer. Two jobs whose time ranges
   * (start → start+duration) overlap, or fall within this buffer of each other,
   * are flagged as a conflict.
   */
  bufferMins: 30,
  /** Fallback duration (minutes) when a service has no configured default. */
  fallbackDurationMins: 120,
} as const;

export const calendarView = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
} as const;

export type CalendarView = (typeof calendarView)[keyof typeof calendarView];

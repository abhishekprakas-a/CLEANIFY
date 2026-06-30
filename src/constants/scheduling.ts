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
} as const;

export const calendarView = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
} as const;

export type CalendarView = (typeof calendarView)[keyof typeof calendarView];

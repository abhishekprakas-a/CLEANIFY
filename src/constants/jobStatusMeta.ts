import { jobStatus, type JobStatus } from "./jobStatus";

/**
 * Presentation metadata for each job status — the single source of truth for how
 * a status is labelled and coloured across the app (badges, calendar, drawers).
 *
 * `group` maps every status onto the spec's six-colour calendar scheme:
 *   grey   → scheduled / not started
 *   amber  → pre-work check pending approval
 *   blue   → on site / in progress
 *   purple → completion pending approval
 *   green  → completed / closed
 *   red    → cancelled / blocked
 *   neutral→ rescheduled (superseded by a new job)
 */
export type StatusGroup =
  | "grey"
  | "amber"
  | "blue"
  | "purple"
  | "green"
  | "red"
  | "neutral";

export interface StatusMeta {
  label: string;
  group: StatusGroup;
  /** Tailwind classes for the pill badge (bg + text). */
  badgeClass: string;
  /** Solid dot / event colour for the calendar (hex, theme-agnostic). */
  calendarColor: string;
}

const GROUP_BADGE: Record<StatusGroup, string> = {
  grey: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-cyan-100 text-cyan-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  neutral: "bg-slate-200 text-slate-500",
};

const GROUP_CALENDAR: Record<StatusGroup, string> = {
  grey: "#94a3b8", // slate-400
  amber: "#f59e0b", // amber-500
  blue: "#06b6d4", // cyan-500
  purple: "#a855f7", // purple-500
  green: "#22c55e", // green-500
  red: "#ef4444", // red-500
  neutral: "#cbd5e1", // slate-300
};

const STATUS_GROUP: Record<JobStatus, StatusGroup> = {
  pending: "grey",
  scheduled: "grey",
  assigned: "grey",
  reachedSite: "amber",
  preWorkPendingApproval: "amber",
  cleaningInProgress: "blue",
  completionPendingApproval: "purple",
  completed: "green",
  closed: "green",
  cancelled: "red",
  rescheduled: "neutral",
  // legacy
  beforePhotoPendingApproval: "amber",
  afterPhotoPendingApproval: "purple",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "Booked",
  scheduled: "Scheduled",
  assigned: "Assigned",
  reachedSite: "On site",
  preWorkPendingApproval: "Pre-work approval",
  cleaningInProgress: "In progress",
  completionPendingApproval: "Completion approval",
  completed: "Completed",
  closed: "Closed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  // legacy
  beforePhotoPendingApproval: "Pre-work approval",
  afterPhotoPendingApproval: "Completion approval",
};

export function statusMeta(status: string): StatusMeta {
  const group = STATUS_GROUP[status as JobStatus] ?? "grey";
  const label =
    STATUS_LABEL[status as JobStatus] ??
    // Fallback: humanize an unknown status string.
    status
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  return {
    label,
    group,
    badgeClass: GROUP_BADGE[group],
    calendarColor: GROUP_CALENDAR[group],
  };
}

export function statusLabel(status: string): string {
  return statusMeta(status).label;
}

export function statusCalendarColor(status: string): string {
  return statusMeta(status).calendarColor;
}

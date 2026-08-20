import { roles, type Role } from "./roles";

export const jobStatus = {
  pending: "pending",
  scheduled: "scheduled",
  assigned: "assigned",
  reachedSite: "reachedSite",
  // v2 approval lifecycle (C12)
  preWorkPendingApproval: "preWorkPendingApproval",
  cleaningInProgress: "cleaningInProgress",
  completionPendingApproval: "completionPendingApproval",
  completed: "completed",
  closed: "closed",
  cancelled: "cancelled",
  rescheduled: "rescheduled",
  // legacy states (kept so any historical record stays valid)
  beforePhotoPendingApproval: "beforePhotoPendingApproval",
  afterPhotoPendingApproval: "afterPhotoPendingApproval",
} as const;

export type JobStatus = (typeof jobStatus)[keyof typeof jobStatus];

export const allJobStatuses: JobStatus[] = Object.values(jobStatus);

/** Statuses that are final — no further transitions. */
export const terminalJobStatuses: JobStatus[] = [
  jobStatus.completed,
  jobStatus.closed,
  jobStatus.cancelled,
  jobStatus.rescheduled,
];

/**
 * Statuses that count as "work done" for productivity/reporting. A job stays
 * COMPLETED until its review + staff ratings are captured, then moves to CLOSED
 * — both represent finished work, so counts must include both.
 */
export const doneJobStatuses: JobStatus[] = [
  jobStatus.completed,
  jobStatus.closed,
];

/**
 * Allowed transitions. Any transition not listed here is rejected with an
 * INVALID_TRANSITION error.
 *
 * Photo approval was removed: technicians drive the job straight through —
 * upload before photos → start cleaning → upload after photos → complete.
 * The legacy `beforePhotoPendingApproval`/`afterPhotoPendingApproval` states
 * are kept (with edges out of them) so any job already in one of those states
 * can still be finished; nothing transitions *into* them anymore.
 */
export const jobTransitions: Record<JobStatus, JobStatus[]> = {
  pending: [jobStatus.scheduled, jobStatus.cancelled],
  scheduled: [jobStatus.assigned, jobStatus.cancelled, jobStatus.rescheduled],
  assigned: [
    jobStatus.reachedSite,
    jobStatus.cancelled,
    jobStatus.rescheduled,
  ],
  // On site → submit pre-work for approval (Phase 3). Direct start kept for
  // backward-compat until the approval gate is enforced.
  reachedSite: [
    jobStatus.preWorkPendingApproval,
    jobStatus.cleaningInProgress,
    jobStatus.cancelled,
  ],
  // Pre-work: admin/supervisor approves → in progress; declines → back on site.
  preWorkPendingApproval: [
    jobStatus.cleaningInProgress,
    jobStatus.reachedSite,
    jobStatus.cancelled,
  ],
  // In progress → submit completion for approval (Phase 3). Direct complete
  // kept for backward-compat until the gate is enforced.
  cleaningInProgress: [
    jobStatus.completionPendingApproval,
    jobStatus.completed,
    jobStatus.cancelled,
  ],
  // Completion: approve → completed; decline → back to in progress (rework).
  completionPendingApproval: [
    jobStatus.completed,
    jobStatus.cleaningInProgress,
    jobStatus.cancelled,
  ],
  // Completed → closed after the customer review + staff rating (Phase 4).
  completed: [jobStatus.closed],
  closed: [],
  cancelled: [],
  rescheduled: [],
  // legacy states (historical records only)
  beforePhotoPendingApproval: [
    jobStatus.cleaningInProgress,
    jobStatus.reachedSite,
  ],
  afterPhotoPendingApproval: [
    jobStatus.completed,
    jobStatus.cleaningInProgress,
  ],
};

/**
 * Role permitted to move a job *into* each status through the generic
 * transition endpoint. Technicians now drive the execution edges end-to-end
 * (start cleaning + complete); admins retain scheduling/assignment edges.
 */
export const jobTransitionRoles: Record<JobStatus, Role[]> = {
  pending: [roles.admin],
  scheduled: [roles.admin],
  assigned: [roles.admin],
  reachedSite: [roles.technician],
  // Technician submits pre-work / completion for approval.
  preWorkPendingApproval: [roles.technician],
  completionPendingApproval: [roles.technician],
  // Entering "in progress" or "completed" is an approval edge — admins, and
  // (per-job) the designated supervisor, who is a technician. The supervisor
  // check is enforced in the service layer, not by role alone.
  cleaningInProgress: [roles.technician, roles.admin],
  completed: [roles.technician, roles.admin],
  // Closing after review + rescheduling are admin-driven.
  closed: [roles.admin],
  rescheduled: [roles.admin],
  cancelled: [roles.admin],
  // legacy
  beforePhotoPendingApproval: [roles.technician],
  afterPhotoPendingApproval: [roles.technician],
};

export const slot = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
} as const;

export type Slot = (typeof slot)[keyof typeof slot];

export const photoKind = {
  before: "before",
  after: "after",
} as const;

export type PhotoKind = (typeof photoKind)[keyof typeof photoKind];

export const approvalStatus = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type ApprovalStatus =
  (typeof approvalStatus)[keyof typeof approvalStatus];

export const paymentStatus = {
  unpaid: "unpaid",
  partial: "partial",
  paid: "paid",
} as const;

export type PaymentStatus = (typeof paymentStatus)[keyof typeof paymentStatus];

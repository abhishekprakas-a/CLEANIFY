import { roles, type Role } from "./roles";

export const jobStatus = {
  pending: "pending",
  scheduled: "scheduled",
  assigned: "assigned",
  reachedSite: "reachedSite",
  beforePhotoPendingApproval: "beforePhotoPendingApproval",
  cleaningInProgress: "cleaningInProgress",
  afterPhotoPendingApproval: "afterPhotoPendingApproval",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type JobStatus = (typeof jobStatus)[keyof typeof jobStatus];

export const allJobStatuses: JobStatus[] = Object.values(jobStatus);

/** Statuses that are final — no further transitions. */
export const terminalJobStatuses: JobStatus[] = [
  jobStatus.completed,
  jobStatus.cancelled,
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
  scheduled: [jobStatus.assigned, jobStatus.cancelled],
  assigned: [jobStatus.reachedSite, jobStatus.cancelled],
  // upload before photos, then start cleaning (no approval)
  reachedSite: [jobStatus.cleaningInProgress, jobStatus.cancelled],
  // legacy: resolve an already-pending before-photo job
  beforePhotoPendingApproval: [
    jobStatus.cleaningInProgress,
    jobStatus.reachedSite,
  ],
  // upload after photos, then complete (no approval)
  cleaningInProgress: [jobStatus.completed, jobStatus.cancelled],
  // legacy: resolve an already-pending after-photo job
  afterPhotoPendingApproval: [
    jobStatus.completed,
    jobStatus.cleaningInProgress,
  ],
  completed: [],
  cancelled: [],
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
  beforePhotoPendingApproval: [roles.technician],
  cleaningInProgress: [roles.technician, roles.admin],
  afterPhotoPendingApproval: [roles.technician],
  completed: [roles.technician, roles.admin],
  cancelled: [roles.admin],
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

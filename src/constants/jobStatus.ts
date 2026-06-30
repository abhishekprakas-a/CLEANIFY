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
 * INVALID_TRANSITION error. The before/after photo approval edges (admin) and
 * the technician execution edges share this table; role gating is separate.
 */
export const jobTransitions: Record<JobStatus, JobStatus[]> = {
  pending: [jobStatus.scheduled, jobStatus.cancelled],
  scheduled: [jobStatus.assigned, jobStatus.cancelled],
  assigned: [jobStatus.reachedSite, jobStatus.cancelled],
  reachedSite: [jobStatus.beforePhotoPendingApproval, jobStatus.cancelled],
  // admin approves before photos → cleaning; rejects → back to site
  beforePhotoPendingApproval: [
    jobStatus.cleaningInProgress,
    jobStatus.reachedSite,
  ],
  cleaningInProgress: [
    jobStatus.afterPhotoPendingApproval,
    jobStatus.cancelled,
  ],
  // admin approves after photos → completed; rejects → back to cleaning
  afterPhotoPendingApproval: [
    jobStatus.completed,
    jobStatus.cleaningInProgress,
  ],
  completed: [],
  cancelled: [],
};

/**
 * Role permitted to drive each transition through the **generic** transition
 * endpoint. Approval/rejection edges are performed by admins through the photo
 * endpoints (which apply the transition internally, bypassing this map).
 */
export const jobTransitionRoles: Record<JobStatus, Role[]> = {
  pending: [roles.admin],
  scheduled: [roles.admin],
  assigned: [roles.admin],
  reachedSite: [roles.technician],
  beforePhotoPendingApproval: [roles.technician],
  cleaningInProgress: [roles.admin],
  afterPhotoPendingApproval: [roles.technician],
  completed: [roles.admin],
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

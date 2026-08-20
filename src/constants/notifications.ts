/**
 * In-app notification types (C6). Each maps to an event in the job lifecycle;
 * the bell in the topbar and the sidebar badges read from these.
 */
export const notificationType = {
  jobAssigned: "jobAssigned",
  jobReassigned: "jobReassigned",
  jobRescheduled: "jobRescheduled",
  preWorkSubmitted: "preWorkSubmitted",
  preWorkApproved: "preWorkApproved",
  preWorkDeclined: "preWorkDeclined",
  completionSubmitted: "completionSubmitted",
  completionApproved: "completionApproved",
  completionDeclined: "completionDeclined",
  jobCancelled: "jobCancelled",
} as const;

export type NotificationType =
  (typeof notificationType)[keyof typeof notificationType];

export const allNotificationTypes: NotificationType[] =
  Object.values(notificationType);

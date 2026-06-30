import { roles, type Role } from "./roles";

/**
 * Canonical permission catalogue. Keys follow `resource:action`. These are the
 * source of truth used to seed the `permissionModel` and the default
 * `roleModel` mappings; fine-grained checks use `requirePermission()`.
 */
export const permissions = {
  dashboardView: "dashboard:view",

  customersRead: "customers:read",
  customersWrite: "customers:write",

  bookingsRead: "bookings:read",
  bookingsWrite: "bookings:write",

  jobsRead: "jobs:read",
  jobsWrite: "jobs:write",
  jobsAssign: "jobs:assign",
  jobsReadAssigned: "jobs:read:assigned",
  jobsTransition: "jobs:transition",

  photosRead: "photos:read",
  photosUpload: "photos:upload",
  photosApprove: "photos:approve",

  attendanceRead: "attendance:read",
  attendanceWrite: "attendance:write",

  reviewsRead: "reviews:read",
  reviewsWrite: "reviews:write",

  reportsView: "reports:view",

  staffRead: "staff:read",
  staffWrite: "staff:write",

  rolesRead: "roles:read",
  rolesWrite: "roles:write",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

export const allPermissions: Permission[] = Object.values(permissions);

/** Human-friendly descriptions, used when seeding the permission catalogue. */
export const permissionDescriptions: Record<Permission, string> = {
  [permissions.dashboardView]: "View the admin dashboard",
  [permissions.customersRead]: "View customers",
  [permissions.customersWrite]: "Create and edit customers",
  [permissions.bookingsRead]: "View bookings",
  [permissions.bookingsWrite]: "Create and edit bookings",
  [permissions.jobsRead]: "View all jobs",
  [permissions.jobsWrite]: "Create and edit jobs",
  [permissions.jobsAssign]: "Assign and schedule jobs",
  [permissions.jobsReadAssigned]: "View own assigned jobs",
  [permissions.jobsTransition]: "Advance job workflow status",
  [permissions.photosRead]: "View job photos",
  [permissions.photosUpload]: "Upload job photos",
  [permissions.photosApprove]: "Approve or reject job photos",
  [permissions.attendanceRead]: "View attendance records",
  [permissions.attendanceWrite]: "Check in and check out",
  [permissions.reviewsRead]: "View reviews",
  [permissions.reviewsWrite]: "Record reviews",
  [permissions.reportsView]: "View reports",
  [permissions.staffRead]: "View staff users",
  [permissions.staffWrite]: "Create and edit staff users",
  [permissions.rolesRead]: "View roles and permissions",
  [permissions.rolesWrite]: "Edit roles and permissions",
};

/**
 * Default permission set per role. Seeded into `roleModel`; also used as the
 * fallback when the DB has not been seeded yet.
 */
export const defaultRolePermissions: Record<Role, Permission[]> = {
  [roles.admin]: [...allPermissions],
  [roles.technician]: [
    permissions.jobsReadAssigned,
    permissions.jobsTransition,
    permissions.photosRead,
    permissions.photosUpload,
    permissions.attendanceRead,
    permissions.attendanceWrite,
  ],
};

export const roleDescriptions: Record<Role, string> = {
  [roles.admin]: "Office / calling staff with full management access",
  [roles.technician]: "Field technician using the mobile PWA",
};

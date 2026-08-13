export const roles = {
  admin: "admin",
  technician: "technician",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export const allRoles: Role[] = Object.values(roles);

export const userStatus = {
  active: "active",
  inactive: "inactive",
  // Self-registered account awaiting admin verification. Cannot log in until
  // an admin approves it (status → active).
  pending: "pending",
} as const;

export type UserStatus = (typeof userStatus)[keyof typeof userStatus];

export const roles = {
  admin: "admin",
  technician: "technician",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export const allRoles: Role[] = Object.values(roles);

export const userStatus = {
  active: "active",
  inactive: "inactive",
} as const;

export type UserStatus = (typeof userStatus)[keyof typeof userStatus];

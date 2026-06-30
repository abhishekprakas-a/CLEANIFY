/**
 * Central route map. UI navigation and redirects should reference these
 * constants instead of hard-coding path strings.
 */
export const routes = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgotPassword",
  resetPassword: "/resetPassword",

  admin: {
    dashboard: "/dashboard",
    customers: "/customers",
    bookings: "/bookings",
    schedule: "/schedule",
    jobs: "/jobs",
    approvals: "/approvals",
    reviews: "/reviews",
    attendance: "/attendance",
    reports: "/reports",
    staff: "/staff",
    audit: "/audit",
  },

  technician: {
    home: "/technician",
    attendance: "/technician/attendance",
    jobs: "/technician/jobs",
    profile: "/technician/profile",
  },

  api: {
    auth: {
      login: "/api/auth/login",
      logout: "/api/auth/logout",
      me: "/api/auth/me",
      refresh: "/api/auth/refresh",
      forgotPassword: "/api/auth/forgotPassword",
      resetPassword: "/api/auth/resetPassword",
    },
    pushSubscribe: "/api/push/subscribe",
    users: "/api/users",
    customers: "/api/customers",
    bookings: "/api/bookings",
    jobs: "/api/jobs",
    schedule: "/api/schedule",
    availability: "/api/schedule/availability",
    technicians: "/api/users?role=technician",
    photos: "/api/photos",
    attendance: "/api/attendance",
    reviews: "/api/reviews",
    dashboard: "/api/dashboard/summary",
    reports: "/api/reports",
  },
} as const;

/** Default landing route per role after login. */
export const roleHomeRoute: Record<string, string> = {
  admin: routes.admin.dashboard,
  technician: routes.technician.home,
};

/**
 * Central route map. UI navigation and redirects should reference these
 * constants instead of hard-coding path strings.
 */
export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  unauthorized: "/unauthorized",
  forgotPassword: "/forgotPassword",
  resetPassword: "/resetPassword",

  admin: {
    dashboard: "/dashboard",
    // v2: Booking Desk consolidates customers + bookings + scheduling.
    bookingDesk: "/booking-desk",
    calendar: "/calendar",
    // Kept for deep links (detail/edit) + old→new redirects.
    customers: "/customers",
    bookings: "/bookings",
    schedule: "/schedule",
    jobs: "/jobs",
    jobNew: "/jobs/new",
    approvals: "/approvals",
    photos: "/photos",
    workApprovals: "/work-approvals",
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
      signup: "/api/auth/signup",
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
    jobsIntake: "/api/jobs/intake",
    schedule: "/api/schedule",
    availability: "/api/schedule/availability",
    workload: "/api/schedule/workload",
    technicians: "/api/users?role=technician",
    photos: "/api/photos",
    attendance: "/api/attendance",
    reviews: "/api/reviews",
    dashboard: "/api/dashboard/summary",
    reports: "/api/reports",
    submissions: "/api/submissions",
    notifications: "/api/notifications",
  },
} as const;

/** Default landing route per role after login. */
export const roleHomeRoute: Record<string, string> = {
  admin: routes.admin.dashboard,
  technician: routes.technician.home,
};

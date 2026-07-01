import type {
  ApprovalStatus,
  AssignmentStatus,
  AttendanceStatus,
  BookingStatus,
  JobStatus,
  PaymentStatus,
  PhotoKind,
  Role,
  SatisfactionStatus,
  Slot,
  TankType,
  UserStatus,
} from "@/constants";

/** A user-facing id as a string (ObjectId serialised). */
export type Id = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SessionUser {
  id: Id;
  name: string;
  email: string;
  role: Role;
  sessionId?: string;
}

/** Session user enriched with the resolved permission keys for the role. */
export interface AuthenticatedUser extends SessionUser {
  permissions: string[];
}

export interface RoleDto {
  id: Id;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export interface PermissionDto {
  id: Id;
  key: string;
  description: string;
}

export interface SessionDto {
  id: Id;
  user: Id;
  userAgent?: string;
  ip?: string;
  expiresAt: string;
  lastUsedAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface User {
  id: Id;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: Id;
  customerName: string;
  mobileNumber: string;
  address: string;
  googleMapLocation?: string;
  notes?: string;
  status: UserStatus;
  createdBy: Id;
  createdAt: string;
  updatedAt: string;
}

/** A customer plus their booking/job history (customer detail view). */
export interface CustomerHistory {
  customer: Customer;
  bookings: Booking[];
  jobs: Job[];
  stats: {
    totalBookings: number;
    totalJobs: number;
    completedJobs: number;
  };
}

export interface BookingStatusEvent {
  status: BookingStatus;
  at: string;
  by: Id;
  note?: string;
}

/** One tank within a job/booking (a property can have several). */
export interface TankEntry {
  name?: string;
  tankType: TankType;
  capacityLitres: number;
  quantity?: number;
  cleaningCharge?: number;
}

export interface Booking {
  id: Id;
  customerId: Id;
  tanks: TankEntry[];
  totalCharge?: number;
  scheduledDate: string;
  scheduledTime?: string;
  specialInstructions?: string;
  bookingStatus: BookingStatus;
  statusHistory: BookingStatusEvent[];
  cancellationReason?: string;
  createdBy: Id;
  createdAt: string;
  updatedAt: string;
}

export interface JobStatusEvent {
  status: JobStatus;
  at: string;
  by: Id;
  note?: string;
}

/** A status-history event with the actor's name resolved, for the timeline. */
export interface JobTimelineEvent {
  status: JobStatus;
  at: string;
  note?: string;
  by: { id: Id; name: string };
}

export interface Job {
  id: Id;
  jobCode: string;
  booking: Id;
  customer: Id;
  assignedTechnicians: Id[];
  tanks: TankEntry[];
  totalCharge?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledSlot?: Slot;
  status: JobStatus;
  statusHistory: JobStatusEvent[];
  startedAt?: string;
  completedAt?: string;
  beforePhotos: Id[];
  afterPhotos: Id[];
  completionNotes?: string;
  priceFinal?: number;
  paymentStatus?: PaymentStatus;
  createdBy: Id;
  createdAt: string;
  updatedAt: string;
}

export interface JobAssignment {
  id: Id;
  job: Id;
  technician: Id;
  assignedBy: Id;
  assignedAt: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: AssignmentStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** A job enriched with populated customer/technician for the schedule views. */
export interface ScheduledJob {
  id: Id;
  jobCode: string;
  status: JobStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  customer?: { id: Id; customerName: string; mobileNumber: string };
  assignedTechnicians: { id: Id; name: string }[];
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  jobs: ScheduledJob[];
}

export interface TechnicianAvailability {
  technician: { id: Id; name: string };
  date: string;
  jobCount: number;
  maxJobsPerDay: number;
  isAvailable: boolean;
  jobs: ScheduledJob[];
}

export interface GeoLocationPair {
  checkIn?: GeoPoint;
  checkOut?: GeoPoint;
}

export interface Attendance {
  id: Id;
  userId: Id;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  workingHours?: number;
  status: AttendanceStatus;
  geoLocation?: GeoLocationPair;
  createdAt: string;
  updatedAt: string;
}

/** Counts of each status within a report period. */
export interface AttendanceCounts {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  total: number;
}

/** A single row in the daily report (one per active technician). */
export interface DailyAttendanceRow {
  userId: Id;
  name: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: number;
}

export interface DailyAttendanceReport {
  date: string;
  counts: AttendanceCounts;
  rows: DailyAttendanceRow[];
}

/** A per-technician summary row aggregated over a date range. */
export interface RangeAttendanceRow {
  userId: Id;
  name: string;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  totalHours: number;
}

export interface RangeAttendanceReport {
  from: string;
  to: string;
  workingDays: number;
  counts: AttendanceCounts;
  rows: RangeAttendanceRow[];
}

export interface PhotoMetadata {
  contentType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  originalName?: string;
  geo?: GeoPoint;
}

export interface Photo {
  id: Id;
  jobId: Id;
  photoType: PhotoKind;
  photoUrl: string;
  s3Key: string;
  metadata: PhotoMetadata;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  uploadedBy: Id;
  reviewedBy?: Id;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** A job awaiting photo approval, with the photos for its current gate. */
export interface PendingReviewItem {
  job: {
    id: Id;
    jobCode: string;
    status: JobStatus;
    customerName: string;
    scheduledDate?: string;
  };
  gate: PhotoKind;
  photos: Photo[];
}

export interface Review {
  id: Id;
  jobId: Id;
  customerId: Id;
  technicianId?: Id;
  starRating: number;
  reviewComment?: string;
  satisfactionStatus: SatisfactionStatus;
  reviewDate: string;
  collectedBy?: Id;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportSummaryItem {
  label: string;
  value: string | number;
}

export interface ReportChart {
  type: "bar" | "line";
  dataLabel: string;
  data: { label: string; value: number }[];
}

/** Uniform report shape — one UI + export path renders every report type. */
export interface ReportPayload {
  title: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  summary: ReportSummaryItem[];
  chart?: ReportChart;
}

export interface DashboardReview {
  id: Id;
  customerName: string;
  technicianName?: string;
  starRating: number;
  reviewComment?: string;
  reviewDate: string;
}

export interface AdminDashboard {
  kpis: {
    todaysJobs: number;
    pendingJobs: number;
    completedJobs: number;
    pendingApprovals: number;
    totalCustomers: number;
    averageRating: number;
  };
  attendanceSummary: {
    date: string;
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    total: number;
  };
  jobsByStatus: { status: string; count: number }[];
  jobsTrend: { date: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  recentReviews: DashboardReview[];
}

export interface TechnicianDashboardData {
  counts: { assignedActive: number; today: number; completed: number };
  attendance: Attendance | null;
  todaysSchedule: ScheduledJob[];
  progress: { status: string; count: number }[];
}

export interface TechnicianRating {
  technicianId: Id;
  name: string;
  averageRating: number;
  reviewCount: number;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<string, number>; // "1".."5" → count
  satisfaction: {
    satisfied: number;
    neutral: number;
    dissatisfied: number;
  };
  technicianRatings: TechnicianRating[];
}

/** A completed job that has no review yet (for the add-review picker). */
export interface ReviewableJob {
  jobId: Id;
  jobCode: string;
  customerName: string;
  technicianName?: string;
  completedAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface ListQuery {
  page: number;
  limit: number;
  sort?: string;
  q?: string;
}

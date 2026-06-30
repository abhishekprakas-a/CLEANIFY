import { dbConnect } from "@/lib/dbConnect";
import { jobStatus, roles, userStatus } from "@/constants";
import { attendanceModel, jobModel, reviewModel, userModel } from "@/models";
import type { ReportPayload } from "@/types";

export interface ReportFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  technicianId?: string;
  status?: string;
}

// --- helpers ---------------------------------------------------------------

function dateMatch(field: string, f: ReportFilters): Record<string, unknown> {
  if (!f.from && !f.to) return {};
  const range: Record<string, Date> = {};
  if (f.from) range.$gte = new Date(`${f.from}T00:00:00`);
  if (f.to) range.$lte = new Date(`${f.to}T23:59:59`);
  return { [field]: range };
}

function fmtDate(d?: Date | string): string {
  return d ? new Date(d).toLocaleDateString() : "";
}
function fmtTime(d?: Date | string): string {
  return d
    ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const reportService = {
  /** Attendance report — records + status breakdown over a date range. */
  async attendance(f: ReportFilters): Promise<ReportPayload> {
    await dbConnect();
    const filter: Record<string, unknown> = {};
    if (f.technicianId) filter.userId = f.technicianId;
    if (f.from || f.to) {
      filter.date = {
        ...(f.from ? { $gte: f.from } : {}),
        ...(f.to ? { $lte: f.to } : {}),
      };
    }

    const docs = await attendanceModel
      .find(filter)
      .sort({ date: -1 })
      .populate("userId", "name")
      .lean();

    const counts = { present: 0, late: 0, halfDay: 0 };
    let totalHours = 0;
    const rows = docs.map((d) => {
      const tech = d.userId as { name?: string } | undefined;
      counts[d.status as keyof typeof counts] =
        (counts[d.status as keyof typeof counts] ?? 0) + 1;
      totalHours += d.workingHours ?? 0;
      return {
        technician: tech?.name ?? "—",
        date: d.date,
        checkIn: fmtTime(d.checkInTime),
        checkOut: fmtTime(d.checkOutTime),
        hours: d.workingHours ?? 0,
        status: d.status,
      };
    });

    return {
      title: "Attendance Report",
      generatedAt: new Date().toISOString(),
      columns: [
        { key: "technician", label: "Technician" },
        { key: "date", label: "Date" },
        { key: "checkIn", label: "Check-in" },
        { key: "checkOut", label: "Check-out" },
        { key: "hours", label: "Hours" },
        { key: "status", label: "Status" },
      ],
      rows,
      summary: [
        { label: "Records", value: docs.length },
        { label: "Present", value: counts.present },
        { label: "Late", value: counts.late },
        { label: "Half day", value: counts.halfDay },
        { label: "Total hours", value: round1(totalHours) },
      ],
      chart: {
        type: "bar",
        dataLabel: "Records",
        data: [
          { label: "Present", value: counts.present },
          { label: "Late", value: counts.late },
          { label: "Half day", value: counts.halfDay },
        ],
      },
    };
  },

  /** Job completion report — jobs + completion rate over a range. */
  async jobCompletion(f: ReportFilters): Promise<ReportPayload> {
    await dbConnect();
    const filter: Record<string, unknown> = {
      ...dateMatch("scheduledDate", f),
    };
    if (f.technicianId) filter.assignedTechnician = f.technicianId;
    if (f.status) filter.status = f.status;

    const docs = await jobModel
      .find(filter)
      .sort({ scheduledDate: -1 })
      .populate("customer", "customerName")
      .populate("assignedTechnician", "name")
      .lean();

    const byStatus = new Map<string, number>();
    const rows = docs.map((d) => {
      const customer = d.customer as { customerName?: string } | undefined;
      const tech = d.assignedTechnician as { name?: string } | undefined;
      byStatus.set(d.status, (byStatus.get(d.status) ?? 0) + 1);
      return {
        jobCode: d.jobCode,
        customer: customer?.customerName ?? "—",
        technician: tech?.name ?? "—",
        scheduledDate: fmtDate(d.scheduledDate),
        completedAt: fmtDate(d.completedAt),
        status: d.status,
      };
    });

    const completed = byStatus.get(jobStatus.completed) ?? 0;
    const rate = docs.length ? Math.round((completed / docs.length) * 100) : 0;

    return {
      title: "Job Completion Report",
      generatedAt: new Date().toISOString(),
      columns: [
        { key: "jobCode", label: "Job code" },
        { key: "customer", label: "Customer" },
        { key: "technician", label: "Technician" },
        { key: "scheduledDate", label: "Scheduled" },
        { key: "completedAt", label: "Completed" },
        { key: "status", label: "Status" },
      ],
      rows,
      summary: [
        { label: "Total jobs", value: docs.length },
        { label: "Completed", value: completed },
        { label: "Completion rate", value: `${rate}%` },
        {
          label: "Cancelled",
          value: byStatus.get(jobStatus.cancelled) ?? 0,
        },
      ],
      chart: {
        type: "bar",
        dataLabel: "Jobs",
        data: [...byStatus.entries()].map(([label, value]) => ({
          label,
          value,
        })),
      },
    };
  },

  /** Technician performance — jobs done, ratings, attendance per technician. */
  async technicianPerformance(f: ReportFilters): Promise<ReportPayload> {
    await dbConnect();
    const [techs, jobsAgg, reviewsAgg, attAgg] = await Promise.all([
      userModel
        .find({ role: roles.technician, status: userStatus.active })
        .select("name")
        .lean(),
      jobModel.aggregate([
        {
          $match: {
            status: jobStatus.completed,
            assignedTechnician: { $ne: null },
            ...dateMatch("completedAt", f),
          },
        },
        { $group: { _id: "$assignedTechnician", count: { $sum: 1 } } },
      ]),
      reviewModel.aggregate([
        {
          $match: {
            technicianId: { $ne: null },
            ...dateMatch("reviewDate", f),
          },
        },
        {
          $group: {
            _id: "$technicianId",
            avg: { $avg: "$starRating" },
            count: { $sum: 1 },
          },
        },
      ]),
      attendanceModel.aggregate([
        {
          $group: {
            _id: "$userId",
            days: { $sum: 1 },
            hours: { $sum: { $ifNull: ["$workingHours", 0] } },
          },
        },
      ]),
    ]);

    const jobsBy = new Map(jobsAgg.map((j) => [String(j._id), j.count]));
    const revBy = new Map(
      reviewsAgg.map((r) => [String(r._id), { avg: r.avg, count: r.count }]),
    );
    const attBy = new Map(
      attAgg.map((a) => [String(a._id), { days: a.days, hours: a.hours }]),
    );

    const rows = techs
      .map((t) => {
        const id = String(t._id);
        const rev = revBy.get(id);
        const att = attBy.get(id);
        return {
          technician: t.name,
          jobsCompleted: jobsBy.get(id) ?? 0,
          avgRating: rev ? round1(rev.avg) : 0,
          reviews: rev?.count ?? 0,
          attendanceDays: att?.days ?? 0,
          totalHours: att ? round1(att.hours) : 0,
        };
      })
      .sort((a, b) => b.jobsCompleted - a.jobsCompleted);

    const totalCompleted = rows.reduce((s, r) => s + r.jobsCompleted, 0);

    return {
      title: "Technician Performance Report",
      generatedAt: new Date().toISOString(),
      columns: [
        { key: "technician", label: "Technician" },
        { key: "jobsCompleted", label: "Jobs done" },
        { key: "avgRating", label: "Avg rating" },
        { key: "reviews", label: "Reviews" },
        { key: "attendanceDays", label: "Days" },
        { key: "totalHours", label: "Hours" },
      ],
      rows,
      summary: [
        { label: "Technicians", value: rows.length },
        { label: "Jobs completed", value: totalCompleted },
        { label: "Top performer", value: rows[0]?.technician ?? "—" },
      ],
      chart: {
        type: "bar",
        dataLabel: "Jobs done",
        data: rows
          .slice(0, 10)
          .map((r) => ({ label: r.technician, value: r.jobsCompleted })),
      },
    };
  },

  /** Customer review report — reviews + ratings over a range. */
  async customerReviews(f: ReportFilters): Promise<ReportPayload> {
    await dbConnect();
    const filter: Record<string, unknown> = { ...dateMatch("reviewDate", f) };
    if (f.technicianId) filter.technicianId = f.technicianId;

    const docs = await reviewModel
      .find(filter)
      .sort({ reviewDate: -1 })
      .populate("customerId", "customerName")
      .populate("technicianId", "name")
      .lean();

    const dist = [1, 2, 3, 4, 5].map((r) => ({ label: `${r}★`, value: 0 }));
    let sum = 0;
    let satisfied = 0;
    const rows = docs.map((d) => {
      const customer = d.customerId as { customerName?: string } | undefined;
      const tech = d.technicianId as { name?: string } | undefined;
      sum += d.starRating;
      if (d.satisfactionStatus === "satisfied") satisfied += 1;
      const bucket = dist[d.starRating - 1];
      if (bucket) bucket.value += 1;
      return {
        customer: customer?.customerName ?? "—",
        technician: tech?.name ?? "—",
        rating: d.starRating,
        satisfaction: d.satisfactionStatus,
        comment: d.reviewComment ?? "",
        date: fmtDate(d.reviewDate),
      };
    });

    return {
      title: "Customer Review Report",
      generatedAt: new Date().toISOString(),
      columns: [
        { key: "customer", label: "Customer" },
        { key: "technician", label: "Technician" },
        { key: "rating", label: "Rating" },
        { key: "satisfaction", label: "Satisfaction" },
        { key: "comment", label: "Comment" },
        { key: "date", label: "Date" },
      ],
      rows,
      summary: [
        { label: "Reviews", value: docs.length },
        {
          label: "Avg rating",
          value: docs.length ? round1(sum / docs.length) : 0,
        },
        {
          label: "Satisfied",
          value: docs.length
            ? `${Math.round((satisfied / docs.length) * 100)}%`
            : "0%",
        },
      ],
      chart: { type: "bar", dataLabel: "Reviews", data: dist },
    };
  },

  /** Monthly productivity — completed jobs, reviews, hours per month for a year. */
  async monthlyProductivity(year: number): Promise<ReportPayload> {
    await dbConnect();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const [jobsAgg, reviewsAgg, attAgg] = await Promise.all([
      jobModel.aggregate([
        {
          $match: {
            status: jobStatus.completed,
            completedAt: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: { $month: "$completedAt" }, count: { $sum: 1 } } },
      ]),
      reviewModel.aggregate([
        { $match: { reviewDate: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $month: "$reviewDate" },
            count: { $sum: 1 },
            avg: { $avg: "$starRating" },
          },
        },
      ]),
      attendanceModel.aggregate([
        { $match: { checkInTime: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $month: "$checkInTime" },
            hours: { $sum: { $ifNull: ["$workingHours", 0] } },
          },
        },
      ]),
    ]);

    const jobsBy = new Map(jobsAgg.map((j) => [j._id as number, j.count]));
    const revBy = new Map(
      reviewsAgg.map((r) => [r._id as number, { count: r.count, avg: r.avg }]),
    );
    const attBy = new Map(attAgg.map((a) => [a._id as number, a.hours]));

    const rows = MONTHS.map((label, i) => {
      const m = i + 1;
      const rev = revBy.get(m);
      return {
        month: label,
        jobsCompleted: jobsBy.get(m) ?? 0,
        reviews: rev?.count ?? 0,
        avgRating: rev ? round1(rev.avg) : 0,
        attendanceHours: round1(attBy.get(m) ?? 0),
      };
    });

    const totalJobs = rows.reduce((s, r) => s + r.jobsCompleted, 0);

    return {
      title: `Monthly Productivity Report — ${year}`,
      generatedAt: new Date().toISOString(),
      columns: [
        { key: "month", label: "Month" },
        { key: "jobsCompleted", label: "Jobs completed" },
        { key: "reviews", label: "Reviews" },
        { key: "avgRating", label: "Avg rating" },
        { key: "attendanceHours", label: "Attendance hrs" },
      ],
      rows,
      summary: [
        { label: "Year", value: year },
        { label: "Jobs completed", value: totalJobs },
        {
          label: "Best month",
          value:
            rows.reduce((a, b) => (b.jobsCompleted > a.jobsCompleted ? b : a))
              .month ?? "—",
        },
      ],
      chart: {
        type: "line",
        dataLabel: "Jobs completed",
        data: rows.map((r) => ({ label: r.month, value: r.jobsCompleted })),
      },
    };
  },
};

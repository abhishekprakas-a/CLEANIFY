import { dbConnect } from "@/lib/dbConnect";
import { jobStatus, terminalJobStatuses } from "@/constants";
import { customerModel, jobModel, reviewModel } from "@/models";
import { attendanceService } from "./attendanceService";
import type {
  AdminDashboard,
  ScheduledJob,
  SessionUser,
  TechnicianDashboardData,
} from "@/types";

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const approvalStatuses = [
  jobStatus.beforePhotoPendingApproval,
  jobStatus.afterPhotoPendingApproval,
];

function mapScheduled(doc: Record<string, unknown>): ScheduledJob {
  const customer = doc.customer as
    | { _id?: unknown; customerName?: string }
    | undefined;
  const techs =
    (doc.assignedTechnicians as
      | { _id?: unknown; name?: string }[]
      | undefined) ?? [];
  return {
    id: String(doc._id),
    jobCode: String(doc.jobCode),
    status: doc.status as ScheduledJob["status"],
    scheduledDate: doc.scheduledDate
      ? new Date(doc.scheduledDate as string).toISOString()
      : undefined,
    scheduledTime: (doc.scheduledTime as string) || undefined,
    customer: customer?._id
      ? {
          id: String(customer._id),
          customerName: customer.customerName ?? "",
          mobileNumber: "",
        }
      : undefined,
    assignedTechnicians: techs
      .filter((t) => t?._id)
      .map((t) => ({ id: String(t._id), name: t.name ?? "" })),
  };
}

export const dashboardService = {
  /** Admin dashboard — KPIs, attendance, approvals, reviews, analytics. */
  async adminSummary(): Promise<AdminDashboard> {
    await dbConnect();
    const { start, end } = todayBounds();
    const last7 = new Date(start);
    last7.setDate(last7.getDate() - 6);

    const [
      todaysJobs,
      pendingJobs,
      completedJobs,
      pendingApprovals,
      totalCustomers,
      ratingAgg,
      statusAgg,
      trendAgg,
      distAgg,
      reviewDocs,
      attendance,
    ] = await Promise.all([
      jobModel.countDocuments({
        scheduledDate: { $gte: start, $lt: end },
        status: { $ne: jobStatus.cancelled },
      }),
      jobModel.countDocuments({ status: { $nin: terminalJobStatuses } }),
      jobModel.countDocuments({ status: jobStatus.completed }),
      jobModel.countDocuments({ status: { $in: approvalStatuses } }),
      customerModel.countDocuments(),
      reviewModel.aggregate([
        { $group: { _id: null, avg: { $avg: "$starRating" } } },
      ]),
      jobModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      jobModel.aggregate([
        { $match: { createdAt: { $gte: last7 } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      reviewModel.aggregate([
        { $group: { _id: "$starRating", count: { $sum: 1 } } },
      ]),
      reviewModel
        .find()
        .sort({ reviewDate: -1 })
        .limit(5)
        .populate("customerId", "customerName")
        .populate("technicianId", "name")
        .lean(),
      attendanceService.dailyReport(dateKey(start)),
    ]);

    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: distAgg.find((d) => d._id === rating)?.count ?? 0,
    }));

    const recentReviews = reviewDocs.map((r) => {
      const c = r.customerId as { customerName?: string } | undefined;
      const t = r.technicianId as { name?: string } | undefined;
      return {
        id: String(r._id),
        customerName: c?.customerName ?? "—",
        technicianName: t?.name,
        starRating: r.starRating,
        reviewComment: r.reviewComment,
        reviewDate: new Date(r.reviewDate).toISOString(),
      };
    });

    return {
      kpis: {
        todaysJobs,
        pendingJobs,
        completedJobs,
        pendingApprovals,
        totalCustomers,
        averageRating: Number((ratingAgg[0]?.avg ?? 0).toFixed(1)),
      },
      attendanceSummary: {
        date: attendance.date,
        ...attendance.counts,
      },
      jobsByStatus: statusAgg.map((s) => ({ status: s._id, count: s.count })),
      jobsTrend: trendAgg.map((t) => ({ date: t._id, count: t.count })),
      ratingDistribution,
      recentReviews,
    };
  },

  /** Technician dashboard — assigned/today/completed counts + progress. */
  async technicianSummary(user: SessionUser): Promise<TechnicianDashboardData> {
    await dbConnect();
    const { start, end } = todayBounds();
    const tech = user.id;

    const [assignedActive, completed, todayDocs, activeDocs, attendance] =
      await Promise.all([
        jobModel.countDocuments({
          assignedTechnicians: tech,
          status: { $nin: terminalJobStatuses },
        }),
        jobModel.countDocuments({
          assignedTechnicians: tech,
          status: jobStatus.completed,
        }),
        jobModel
          .find({
            assignedTechnicians: tech,
            scheduledDate: { $gte: start, $lt: end },
            status: { $ne: jobStatus.cancelled },
          })
          .sort({ scheduledTime: 1 })
          .populate("customer", "customerName")
          .populate("assignedTechnicians", "name")
          .lean(),
        jobModel
          .find({
            assignedTechnicians: tech,
            status: { $nin: terminalJobStatuses },
          })
          .select("status")
          .lean(),
        attendanceService.today(user),
      ]);

    const todaysSchedule = todayDocs.map((d) =>
      mapScheduled(d as Record<string, unknown>),
    );

    const progressMap = new Map<string, number>();
    for (const j of activeDocs) {
      progressMap.set(j.status, (progressMap.get(j.status) ?? 0) + 1);
    }

    return {
      counts: {
        assignedActive,
        today: todaysSchedule.length,
        completed,
      },
      attendance,
      todaysSchedule,
      progress: [...progressMap.entries()].map(([status, count]) => ({
        status,
        count,
      })),
    };
  },
};

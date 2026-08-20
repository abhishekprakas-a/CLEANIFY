import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto, toDtoList } from "@/lib/serialize";
import { buildMeta } from "@/lib/pagination";
import { applyJobTransition } from "@/lib/jobWorkflow";
import {
  jobStatus,
  satisfactionFromRating,
  satisfactionStatus,
} from "@/constants";
import { jobModel, reviewModel, staffRatingModel } from "@/models";
import type { CreateReviewInput } from "@/schemas/reviewSchema";
import type {
  ListQuery,
  PaginationMeta,
  Review,
  ReviewSummary,
  ReviewableJob,
  SessionUser,
} from "@/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const reviewService = {
  async list(
    query: ListQuery,
    filters: { technicianId?: string } = {},
  ): Promise<{ items: Review[]; meta: PaginationMeta }> {
    await dbConnect();
    const filter: Record<string, unknown> = {};
    if (filters.technicianId) filter.technicianId = filters.technicianId;

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      reviewModel
        .find(filter)
        .sort({ reviewDate: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate("customerId", "customerName mobileNumber")
        .populate("technicianId", "name")
        .lean(),
      reviewModel.countDocuments(filter),
    ]);

    return {
      items: toDtoList<Review>(docs),
      meta: buildMeta(total, query.page, query.limit),
    };
  },

  async create(input: CreateReviewInput, user: SessionUser): Promise<Review> {
    await dbConnect();

    const job = await jobModel.findById(input.jobId);
    if (!job) throw ApiError.notFound("Job not found");
    if (job.status !== jobStatus.completed) {
      throw ApiError.unprocessable("Only completed jobs can be reviewed");
    }

    const existing = await reviewModel.exists({ jobId: job._id });
    if (existing) throw ApiError.conflict("This job already has a review");

    const created = await reviewModel.create({
      jobId: job._id,
      customerId: job.customer,
      // Credit the primary (first) crew member — keeps reviews single-tech.
      technicianId: job.assignedTechnicians[0],
      starRating: input.starRating,
      reviewComment: input.reviewComment,
      satisfactionStatus:
        input.satisfactionStatus ?? satisfactionFromRating(input.starRating),
      reviewDate: input.reviewDate ?? new Date(),
      source: input.source,
      collectedBy: user.id,
    });

    // Optional internal staff ratings — one per crew member (idempotent upsert).
    if (input.staffRatings?.length) {
      await Promise.all(
        input.staffRatings.map((r) =>
          staffRatingModel.updateOne(
            { jobId: job._id, staffUserId: r.staffUserId },
            {
              $set: {
                rating: r.rating,
                remark: r.remark,
                ratedBy: user.id,
                ratedAt: new Date(),
              },
            },
            { upsert: true },
          ),
        ),
      );
    }

    // Capturing the review closes the job (COMPLETED → CLOSED).
    if (job.status === jobStatus.completed) {
      applyJobTransition(job, jobStatus.closed, user.id, "Review captured");
      await job.save();
    }

    return toDto<Review>(created.toObject());
  },

  /** Existing staff ratings for a job (to prefill the review form). */
  async staffRatingsForJob(
    jobId: string,
  ): Promise<{ staffUserId: string; rating: number; remark?: string }[]> {
    await dbConnect();
    const docs = await staffRatingModel.find({ jobId }).lean();
    return docs.map((d) => ({
      staffUserId: String(d.staffUserId),
      rating: d.rating,
      remark: d.remark,
    }));
  },

  /** Average internal staff rating per technician (for staff profiles/reports). */
  async staffRatingSummary(): Promise<
    { staffUserId: string; average: number; count: number }[]
  > {
    await dbConnect();
    const agg = await staffRatingModel.aggregate<{
      _id: unknown;
      avg: number;
      count: number;
    }>([
      {
        $group: {
          _id: "$staffUserId",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);
    return agg.map((a) => ({
      staffUserId: String(a._id),
      average: round1(a.avg ?? 0),
      count: a.count,
    }));
  },

  /** Aggregate metrics: average, distribution, satisfaction, per-technician. */
  async summary(): Promise<ReviewSummary> {
    await dbConnect();

    const [overall, distribution, satisfaction, perTech] = await Promise.all([
      reviewModel.aggregate([
        {
          $group: {
            _id: null,
            avg: { $avg: "$starRating" },
            count: { $sum: 1 },
          },
        },
      ]),
      reviewModel.aggregate([
        { $group: { _id: "$starRating", count: { $sum: 1 } } },
      ]),
      reviewModel.aggregate([
        { $group: { _id: "$satisfactionStatus", count: { $sum: 1 } } },
      ]),
      reviewModel.aggregate([
        { $match: { technicianId: { $ne: null } } },
        {
          $group: {
            _id: "$technicianId",
            avg: { $avg: "$starRating" },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "tech",
          },
        },
        { $sort: { avg: -1 } },
      ]),
    ]);

    const ratingDistribution: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
    for (const d of distribution) ratingDistribution[String(d._id)] = d.count;

    const sat = { satisfied: 0, neutral: 0, dissatisfied: 0 };
    for (const s of satisfaction) {
      if (s._id === satisfactionStatus.satisfied) sat.satisfied = s.count;
      else if (s._id === satisfactionStatus.neutral) sat.neutral = s.count;
      else if (s._id === satisfactionStatus.dissatisfied)
        sat.dissatisfied = s.count;
    }

    return {
      totalReviews: overall[0]?.count ?? 0,
      averageRating: round1(overall[0]?.avg ?? 0),
      ratingDistribution,
      satisfaction: sat,
      technicianRatings: perTech.map((t) => ({
        technicianId: String(t._id),
        name: t.tech?.[0]?.name ?? "Unknown",
        averageRating: round1(t.avg ?? 0),
        reviewCount: t.count,
      })),
    };
  },

  /** Completed jobs that don't yet have a review (for the add-review picker). */
  async reviewableJobs(): Promise<ReviewableJob[]> {
    await dbConnect();
    const reviewed = await reviewModel.find().select("jobId").lean();
    const reviewedIds = reviewed.map((r) => r.jobId);

    const jobs = await jobModel
      .find({ status: jobStatus.completed, _id: { $nin: reviewedIds } })
      .sort({ completedAt: -1 })
      .limit(100)
      .populate("customer", "customerName")
      .populate("assignedTechnicians", "name")
      .lean();

    return jobs.map((job) => {
      const customer = job.customer as { customerName?: string } | undefined;
      const techs =
        (job.assignedTechnicians as
          | { _id?: unknown; name?: string }[]
          | undefined) ?? [];
      return {
        jobId: String(job._id),
        jobCode: job.jobCode,
        customerName: customer?.customerName ?? "—",
        technicianName:
          techs
            .map((t) => t?.name)
            .filter(Boolean)
            .join(", ") || undefined,
        technicians: techs
          .filter((t) => t?._id)
          .map((t) => ({ id: String(t._id), name: t.name ?? "" })),
        completedAt: job.completedAt
          ? new Date(job.completedAt).toISOString()
          : undefined,
      };
    });
  },
};

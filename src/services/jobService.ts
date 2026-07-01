import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto, toDtoList } from "@/lib/serialize";
import { buildMeta } from "@/lib/pagination";
import { applyJobTransition } from "@/lib/jobWorkflow";
import { recordAudit } from "@/lib/audit";
import {
  appConfig,
  bookingStatus,
  jobStatus,
  jobTransitionRoles,
  jobTransitions,
  photoKind,
  roles,
  type JobStatus,
} from "@/constants";
import {
  attendanceModel,
  bookingModel,
  jobModel,
  photoModel,
  userModel,
} from "@/models";
import type {
  CancelJobInput,
  CreateJobInput,
  TransitionJobInput,
} from "@/schemas/jobSchema";
import type {
  Job,
  JobTimelineEvent,
  ListQuery,
  PaginationMeta,
  SessionUser,
} from "@/types";

function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function generateJobCode(): Promise<string> {
  const day = todayKey().replace(/-/g, "");
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const countToday = await jobModel.countDocuments({
    createdAt: { $gte: start },
  });
  const seq = String(countToday + 1).padStart(4, "0");
  return `${appConfig.jobCodePrefix}-${day}-${seq}`;
}

export const jobService = {
  async list(
    query: ListQuery,
    filters: { status?: string; technician?: string; date?: string } = {},
  ): Promise<{ items: Job[]; meta: PaginationMeta }> {
    await dbConnect();
    const filter: Record<string, unknown> = {};
    if (filters.status) filter.status = filters.status;
    if (filters.technician) filter.assignedTechnicians = filters.technician;
    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.scheduledDate = { $gte: start, $lt: end };
    }

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      jobModel
        .find(filter)
        .sort(query.sort)
        .skip(skip)
        .limit(query.limit)
        .populate("customer", "customerName mobileNumber address")
        .populate("assignedTechnicians", "name phone")
        .lean(),
      jobModel.countDocuments(filter),
    ]);

    return {
      items: toDtoList<Job>(docs),
      meta: buildMeta(total, query.page, query.limit),
    };
  },

  /** Jobs assigned to a specific technician (their PWA queue). */
  async listForTechnician(
    technicianId: string,
    query: ListQuery,
  ): Promise<{ items: Job[]; meta: PaginationMeta }> {
    return jobService.list(query, { technician: technicianId });
  },

  async getById(id: string, user: SessionUser): Promise<Job> {
    await dbConnect();
    const doc = await jobModel
      .findById(id)
      .populate("customer")
      .populate("assignedTechnicians", "name phone")
      .lean();
    if (!doc) throw ApiError.notFound("Job not found");

    if (
      user.role === roles.technician &&
      !(doc.assignedTechnicians ?? []).some(
        (t) => String((t as { _id?: unknown })?._id ?? t) === user.id,
      )
    ) {
      throw ApiError.forbidden();
    }

    return toDto<Job>(doc);
  },

  /** Resolved status-history timeline (audit trail) for a job. */
  async timeline(id: string, user: SessionUser): Promise<JobTimelineEvent[]> {
    await dbConnect();
    const job = await jobModel.findById(id).lean();
    if (!job) throw ApiError.notFound("Job not found");

    if (
      user.role === roles.technician &&
      !(job.assignedTechnicians ?? []).some((t) => String(t) === user.id)
    ) {
      throw ApiError.forbidden();
    }

    const history = job.statusHistory ?? [];
    const actorIds = [...new Set(history.map((e) => String(e.by)))];
    const actors = await userModel
      .find({ _id: { $in: actorIds } })
      .select("name")
      .lean();
    const nameById = new Map(actors.map((a) => [String(a._id), a.name]));

    return history.map((e) => ({
      status: e.status as JobTimelineEvent["status"],
      at: new Date(e.at).toISOString(),
      note: e.note,
      by: { id: String(e.by), name: nameById.get(String(e.by)) ?? "Unknown" },
    }));
  },

  /** Create a job from a booking. Starts `pending`; scheduling is separate. */
  async createFromBooking(
    input: CreateJobInput,
    user: SessionUser,
  ): Promise<Job> {
    await dbConnect();

    const booking = await bookingModel.findById(input.booking);
    if (!booking) throw ApiError.badRequest("Booking does not exist");

    const existing = await jobModel.exists({ booking: booking._id });
    if (existing)
      throw ApiError.conflict("A job already exists for this booking");

    const jobCode = await generateJobCode();
    const job = await jobModel.create({
      jobCode,
      booking: booking._id,
      customer: booking.customerId,
      tanks: booking.tanks,
      totalCharge: booking.totalCharge,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime || undefined,
      status: jobStatus.pending,
      statusHistory: [
        { status: jobStatus.pending, at: new Date(), by: user.id },
      ],
      createdBy: user.id,
    });

    // If a date was supplied, move straight to `scheduled`.
    if (input.scheduledDate) {
      applyJobTransition(
        job,
        jobStatus.scheduled,
        user.id,
        "Scheduled on create",
      );
      await job.save();
      await bookingModel.findByIdAndUpdate(booking._id, {
        bookingStatus: bookingStatus.scheduled,
      });
    }

    return toDto<Job>(job.toObject());
  },

  /**
   * Generic execution-workflow transition. Validates the edge, the role for that
   * edge, and technician-specific guards, then applies it.
   */
  async transition(
    id: string,
    input: TransitionJobInput,
    user: SessionUser,
  ): Promise<Job> {
    await dbConnect();

    const job = await jobModel.findById(id);
    if (!job) throw ApiError.notFound("Job not found");

    const current = job.status as JobStatus;
    const next = input.to as JobStatus;

    if (!jobTransitions[current]?.includes(next)) {
      throw ApiError.invalidTransition(
        `Cannot move a job from "${current}" to "${next}"`,
      );
    }
    if (!jobTransitionRoles[next]?.includes(user.role)) {
      throw ApiError.forbidden("Your role cannot perform this transition");
    }

    // Technician guards.
    if (user.role === roles.technician) {
      if (!job.assignedTechnicians.some((t) => String(t) === user.id)) {
        throw ApiError.forbidden("This job is not assigned to you");
      }
      if (next === jobStatus.reachedSite) {
        const checkedIn = await attendanceModel.exists({
          userId: user.id,
          date: todayKey(),
        });
        if (!checkedIn) {
          throw ApiError.unprocessable(
            "You must check in before starting a job",
          );
        }
      }
      if (next === jobStatus.beforePhotoPendingApproval) {
        const before = await photoModel.countDocuments({
          jobId: job._id,
          photoType: photoKind.before,
        });
        if (before < 1) {
          throw ApiError.unprocessable("Upload at least one before photo");
        }
      }
      if (next === jobStatus.afterPhotoPendingApproval) {
        const after = await photoModel.countDocuments({
          jobId: job._id,
          photoType: photoKind.after,
        });
        if (after < 1) {
          throw ApiError.unprocessable("Upload at least one after photo");
        }
        if (input.completionNotes) job.completionNotes = input.completionNotes;
      }
    }

    applyJobTransition(job, next, user.id, input.note);
    await job.save();
    return toDto<Job>(job.toObject());
  },

  async cancel(
    id: string,
    input: CancelJobInput,
    user: SessionUser,
  ): Promise<Job> {
    await dbConnect();
    const job = await jobModel.findById(id);
    if (!job) throw ApiError.notFound("Job not found");

    applyJobTransition(job, jobStatus.cancelled, user.id, input.reason);
    await job.save();
    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "job.cancel",
      entityType: "job",
      entityId: id,
      meta: { reason: input.reason },
    });
    return toDto<Job>(job.toObject());
  },
};

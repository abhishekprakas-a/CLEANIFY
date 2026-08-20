import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto } from "@/lib/serialize";
import { recordAudit } from "@/lib/audit";
import { applyJobTransition } from "@/lib/jobWorkflow";
import {
  assignmentStatus,
  bookingStatus,
  calendarView,
  jobStatus,
  notificationType,
  roles,
  schedulingPolicy,
  serviceDefaultDurationMins,
  terminalJobStatuses,
  userStatus,
  type CalendarView,
  type JobStatus,
} from "@/constants";
import {
  attendanceModel,
  bookingModel,
  jobAssignmentModel,
  jobModel,
  userModel,
} from "@/models";
import { inAppNotificationService } from "./inAppNotificationService";
import type {
  AssignJobInput,
  ReassignJobInput,
  RescheduleJobInput,
} from "@/schemas/jobSchema";
import type {
  DaySchedule,
  Job,
  ScheduledJob,
  SessionUser,
  TechnicianAvailability,
  TechnicianWorkload,
} from "@/types";

// --- date helpers (local day) ---------------------------------------------

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/** "HH:mm" → minutes since midnight, or null if absent/malformed. */
function timeToMins(time?: string | null): number | null {
  if (!time) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Effective duration (minutes) for a job — explicit, else per-service default. */
function jobDurationMins(job: {
  estimatedDurationMins?: number | null;
  serviceType?: string | null;
}): number {
  return (
    job.estimatedDurationMins ??
    serviceDefaultDurationMins(job.serviceType ?? undefined)
  );
}

// --- mapping ---------------------------------------------------------------

interface PopulatedRef {
  _id: unknown;
  customerName?: string;
  mobileNumber?: string;
  name?: string;
}

function toScheduledJob(doc: Record<string, unknown>): ScheduledJob {
  const customer = doc.customer as PopulatedRef | undefined;
  const techs = (doc.assignedTechnicians as PopulatedRef[] | undefined) ?? [];
  return {
    id: String(doc._id),
    jobCode: String(doc.jobCode),
    status: doc.status as JobStatus,
    scheduledDate: doc.scheduledDate
      ? new Date(doc.scheduledDate as string).toISOString()
      : undefined,
    scheduledTime: (doc.scheduledTime as string) || undefined,
    estimatedDurationMins:
      (doc.estimatedDurationMins as number | undefined) ?? undefined,
    supervisorId: doc.supervisor ? String(doc.supervisor) : undefined,
    customer: customer?._id
      ? {
          id: String(customer._id),
          customerName: customer.customerName ?? "",
          mobileNumber: customer.mobileNumber ?? "",
        }
      : undefined,
    assignedTechnicians: techs
      .filter((t) => t?._id)
      .map((t) => ({ id: String(t._id), name: t.name ?? "" })),
  };
}

async function findScheduledJobs(
  start: Date,
  end: Date,
  technicianId?: string,
): Promise<ScheduledJob[]> {
  const filter: Record<string, unknown> = {
    scheduledDate: { $gte: start, $lt: end },
    status: { $nin: [jobStatus.cancelled] },
  };
  if (technicianId) filter.assignedTechnicians = technicianId;

  const docs = await jobModel
    .find(filter)
    .sort({ scheduledDate: 1, scheduledTime: 1 })
    .populate("customer", "customerName mobileNumber")
    .populate("assignedTechnicians", "name")
    .lean();

  return docs.map((d) => toScheduledJob(d as Record<string, unknown>));
}

/**
 * Notify each assigned technician (in-app + best-effort push). Never throws — a
 * failed/disabled notification must not fail the assignment itself.
 */
async function notifyAssignedTechnicians(
  job: { _id: unknown; jobCode: string; scheduledDate?: Date | null },
  technicianIds: string[],
  kind: "assigned" | "reassigned" = "assigned",
): Promise<void> {
  const when = job.scheduledDate
    ? new Date(job.scheduledDate).toLocaleDateString()
    : "soon";
  const verb = kind === "assigned" ? "assigned to you" : "reassigned to you";
  await inAppNotificationService.emitMany(
    technicianIds.map(String),
    {
      type:
        kind === "assigned"
          ? notificationType.jobAssigned
          : notificationType.jobReassigned,
      jobId: String(job._id),
      message: `${job.jobCode} — ${verb}, scheduled ${when}`,
      url: `/technician/jobs/${String(job._id)}`,
      push: { title: "New job assigned" },
    },
  );
}

// --- service ---------------------------------------------------------------

export const schedulingService = {
  /**
   * Detect a scheduling conflict for a technician on a given day.
   *
   * When the incoming job has a start time, this compares time ranges
   * (start → start + duration) with a travel/setup buffer applied on each side;
   * any overlap with another of the technician's non-terminal jobs is a
   * conflict. Jobs without a start time fall back to the "any job that day"
   * rule (a timeless job can't be range-checked). The returned job lets callers
   * name the clashing job in the error.
   */
  async findConflict(
    technicianId: string,
    date: Date,
    time: string | undefined,
    excludeJobId?: string,
    durationMins?: number,
  ): Promise<Job | null> {
    const { start, end } = dayRange(date);
    const filter: Record<string, unknown> = {
      assignedTechnicians: technicianId,
      status: { $nin: terminalJobStatuses },
      scheduledDate: { $gte: start, $lt: end },
    };
    if (excludeJobId) filter._id = { $ne: excludeJobId };

    const sameDay = await jobModel.find(filter).lean();
    if (sameDay.length === 0) return null;

    const startMins = timeToMins(time);
    // No start time on the incoming job → can't range-check; any same-day job
    // is treated as a clash (preserves the previous timeless behaviour).
    if (startMins == null) {
      return toDto<Job>(sameDay[0]);
    }

    const buffer = schedulingPolicy.bufferMins;
    const endMins =
      startMins + (durationMins ?? serviceDefaultDurationMins(undefined));

    for (const other of sameDay) {
      const otherStart = timeToMins(
        (other as { scheduledTime?: string }).scheduledTime,
      );
      if (otherStart == null) continue; // timeless existing job — no overlap
      const otherEnd =
        otherStart +
        jobDurationMins(
          other as { estimatedDurationMins?: number; serviceType?: string },
        );
      // Overlap (with buffer) when each range starts before the other ends.
      if (startMins < otherEnd + buffer && otherStart < endMins + buffer) {
        return toDto<Job>(other);
      }
    }
    return null;
  },

  /** Active (non-terminal) jobs a technician already holds on a day. */
  async availability(
    technicianId: string,
    dateStr: string,
  ): Promise<TechnicianAvailability> {
    await dbConnect();
    const tech = await userModel
      .findOne({ _id: technicianId, role: roles.technician })
      .select("name")
      .lean();
    if (!tech) throw ApiError.notFound("Technician not found");

    const { start, end } = dayRange(parseDate(dateStr));
    const [docs, attendance] = await Promise.all([
      jobModel
        .find({
          assignedTechnicians: technicianId,
          status: { $nin: terminalJobStatuses },
          scheduledDate: { $gte: start, $lt: end },
        })
        .populate("customer", "customerName mobileNumber")
        .populate("assignedTechnicians", "name")
        .lean(),
      attendanceModel
        .findOne({ userId: technicianId, date: dateStr })
        .select("status")
        .lean(),
    ]);

    const jobs = docs.map((d) => toScheduledJob(d as Record<string, unknown>));
    return {
      technician: { id: String(tech._id), name: tech.name },
      date: dateStr,
      jobCount: jobs.length,
      maxJobsPerDay: schedulingPolicy.maxJobsPerDay,
      isAvailable: jobs.length < schedulingPolicy.maxJobsPerDay,
      attendanceStatus: attendance?.status ?? null,
      jobs,
    };
  },

  async assertTechnicianAvailable(
    technicianId: string,
    date: Date,
    time: string | undefined,
    excludeJobId?: string,
    durationMins?: number,
  ): Promise<void> {
    const tech = await userModel.findOne({
      _id: technicianId,
      role: roles.technician,
      status: userStatus.active,
    });
    if (!tech) throw ApiError.badRequest("Technician is not active");

    const conflict = await schedulingService.findConflict(
      technicianId,
      date,
      time,
      excludeJobId,
      durationMins,
    );
    if (conflict) {
      const at = conflict.scheduledTime ? ` at ${conflict.scheduledTime}` : "";
      throw ApiError.conflict(
        `${tech.name} already has job ${conflict.jobCode}${at} — overlaps this slot`,
      );
    }

    const { start, end } = dayRange(date);
    const sameDay = await jobModel.countDocuments({
      assignedTechnicians: technicianId,
      status: { $nin: terminalJobStatuses },
      scheduledDate: { $gte: start, $lt: end },
      ...(excludeJobId ? { _id: { $ne: excludeJobId } } : {}),
    });
    if (sameDay >= schedulingPolicy.maxJobsPerDay) {
      throw ApiError.unprocessable(
        `Technician is at capacity (${schedulingPolicy.maxJobsPerDay} jobs) that day`,
      );
    }
  },

  /**
   * Assign one or more technicians + (optional) date/time. Moves the job to
   * `assigned`. Each technician gets their own active jobAssignment and is
   * capacity/conflict-checked independently.
   */
  async assign(
    jobId: string,
    input: AssignJobInput,
    user: SessionUser,
  ): Promise<Job> {
    await dbConnect();
    const job = await jobModel.findById(jobId);
    if (!job) throw ApiError.notFound("Job not found");
    if (terminalJobStatuses.includes(job.status as JobStatus)) {
      throw ApiError.conflict(`A ${job.status} job cannot be assigned`);
    }

    const scheduledDate = input.scheduledDate ?? job.scheduledDate;
    if (!scheduledDate) {
      throw ApiError.badRequest("Schedule a date before assigning");
    }
    const scheduledTime = input.scheduledTime || job.scheduledTime;
    const durationMins =
      input.estimatedDurationMins ??
      job.estimatedDurationMins ??
      serviceDefaultDurationMins(job.serviceType);

    const technicianIds = [...new Set(input.technicianIds)];
    // A supervisor, if named, must be part of the assigned crew.
    if (input.supervisorId && !technicianIds.includes(input.supervisorId)) {
      throw ApiError.badRequest(
        "The supervisor must be one of the assigned technicians",
      );
    }
    for (const technicianId of technicianIds) {
      await schedulingService.assertTechnicianAvailable(
        technicianId,
        scheduledDate,
        scheduledTime,
        jobId,
        durationMins,
      );
    }

    job.scheduledDate = scheduledDate;
    job.scheduledTime = scheduledTime;
    job.estimatedDurationMins = durationMins;
    job.assignedTechnicians = technicianIds as never;
    job.supervisor = (input.supervisorId ?? technicianIds[0]) as never;

    // pending → scheduled → assigned (skip the first hop if already scheduled).
    if (job.status === jobStatus.pending) {
      applyJobTransition(job, jobStatus.scheduled, user.id);
    }
    if (job.status === jobStatus.scheduled) {
      applyJobTransition(job, jobStatus.assigned, user.id, "Assigned");
    }
    await job.save();

    // Supersede any prior active assignments, then record one per technician.
    await jobAssignmentModel.updateMany(
      { job: job._id, status: assignmentStatus.active },
      { status: assignmentStatus.reassigned },
    );
    await jobAssignmentModel.insertMany(
      technicianIds.map((technicianId) => ({
        job: job._id,
        technician: technicianId,
        assignedBy: user.id,
        assignedAt: new Date(),
        scheduledDate,
        scheduledTime,
        status: assignmentStatus.active,
      })),
    );

    await bookingModel.findByIdAndUpdate(job.booking, {
      bookingStatus: bookingStatus.scheduled,
    });

    await notifyAssignedTechnicians(job, technicianIds);
    return toDto<Job>(job.toObject());
  },

  /** Replace an assigned job's crew (job stays `assigned`). */
  async reassign(
    jobId: string,
    input: ReassignJobInput,
    user: SessionUser,
  ): Promise<Job> {
    await dbConnect();
    const job = await jobModel.findById(jobId);
    if (!job) throw ApiError.notFound("Job not found");
    if (job.status !== jobStatus.assigned) {
      throw ApiError.conflict(
        "Only an assigned job (before work starts) can be reassigned",
      );
    }
    if (!job.scheduledDate) throw ApiError.badRequest("Job has no schedule");

    const technicianIds = [...new Set(input.technicianIds)];
    if (input.supervisorId && !technicianIds.includes(input.supervisorId)) {
      throw ApiError.badRequest(
        "The supervisor must be one of the assigned technicians",
      );
    }
    const durationMins = jobDurationMins(job);
    for (const technicianId of technicianIds) {
      await schedulingService.assertTechnicianAvailable(
        technicianId,
        job.scheduledDate,
        job.scheduledTime,
        jobId,
        durationMins,
      );
    }

    await jobAssignmentModel.updateMany(
      { job: job._id, status: assignmentStatus.active },
      { status: assignmentStatus.reassigned },
    );
    await jobAssignmentModel.insertMany(
      technicianIds.map((technicianId) => ({
        job: job._id,
        technician: technicianId,
        assignedBy: user.id,
        assignedAt: new Date(),
        scheduledDate: job.scheduledDate,
        scheduledTime: job.scheduledTime,
        status: assignmentStatus.active,
        note: input.note,
      })),
    );

    job.assignedTechnicians = technicianIds as never;
    // Keep the supervisor valid: use the named one, else the previous supervisor
    // if still on the crew, else the first technician.
    const prevSupervisor = job.supervisor ? String(job.supervisor) : undefined;
    job.supervisor = (input.supervisorId ??
      (prevSupervisor && technicianIds.includes(prevSupervisor)
        ? prevSupervisor
        : technicianIds[0])) as never;
    job.statusHistory.push({
      status: jobStatus.assigned,
      at: new Date(),
      by: user.id,
      note: input.note ?? "Reassigned",
    } as never);
    await job.save();

    await notifyAssignedTechnicians(job, technicianIds, "reassigned");
    return toDto<Job>(job.toObject());
  },

  /**
   * Active (non-terminal) job count per active technician — the crew "load" —
   * plus today's attendance so the assign UI can flag absent/half-day workers.
   */
  async workload(): Promise<TechnicianWorkload[]> {
    await dbConnect();
    const today = dateKey(new Date());
    const [techs, counts, attendance] = await Promise.all([
      userModel
        .find({ role: roles.technician, status: userStatus.active })
        .select("name")
        .sort({ name: 1 })
        .lean(),
      jobModel.aggregate<{ _id: unknown; count: number }>([
        { $match: { status: { $nin: terminalJobStatuses } } },
        { $unwind: "$assignedTechnicians" },
        { $group: { _id: "$assignedTechnicians", count: { $sum: 1 } } },
      ]),
      attendanceModel.find({ date: today }).select("userId status").lean(),
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.count]));
    const attById = new Map(
      attendance.map((a) => [String(a.userId), a.status]),
    );
    return techs.map((t) => ({
      id: String(t._id),
      name: t.name,
      activeJobs: byId.get(String(t._id)) ?? 0,
      attendanceStatus: attById.get(String(t._id)) ?? null,
    }));
  },

  /** Change a job's date/time, keeping the technician. */
  async reschedule(
    jobId: string,
    input: RescheduleJobInput,
    user: SessionUser,
  ): Promise<Job> {
    await dbConnect();
    const job = await jobModel.findById(jobId);
    if (!job) throw ApiError.notFound("Job not found");
    if (terminalJobStatuses.includes(job.status as JobStatus)) {
      throw ApiError.conflict(`A ${job.status} job cannot be rescheduled`);
    }

    const scheduledTime = input.scheduledTime || undefined;
    const durationMins = jobDurationMins(job);
    for (const technicianId of job.assignedTechnicians ?? []) {
      await schedulingService.assertTechnicianAvailable(
        String(technicianId),
        input.scheduledDate,
        scheduledTime,
        jobId,
        durationMins,
      );
    }

    const prevDate = job.scheduledDate;
    const prevTime = job.scheduledTime;
    job.scheduledDate = input.scheduledDate;
    job.scheduledTime = scheduledTime;
    job.statusHistory.push({
      status: job.status,
      at: new Date(),
      by: user.id,
      note: input.note ?? "Rescheduled",
    } as never);
    await job.save();

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "job.reschedule",
      entityType: "job",
      entityId: String(job._id),
      meta: {
        from: {
          date: prevDate ? new Date(prevDate).toISOString() : null,
          time: prevTime ?? null,
        },
        to: {
          date: new Date(input.scheduledDate).toISOString(),
          time: scheduledTime ?? null,
        },
      },
    });

    await jobAssignmentModel.updateMany(
      { job: job._id, status: assignmentStatus.active },
      { scheduledDate: input.scheduledDate, scheduledTime },
    );

    const when = new Date(input.scheduledDate).toLocaleDateString();
    await inAppNotificationService.emitMany(
      (job.assignedTechnicians ?? []).map(String),
      {
        type: notificationType.jobRescheduled,
        jobId: String(job._id),
        message: `${job.jobCode} rescheduled to ${when}${
          scheduledTime ? ` · ${scheduledTime}` : ""
        }`,
        url: `/technician/jobs/${String(job._id)}`,
        push: { title: "Job rescheduled" },
      },
    );

    return toDto<Job>(job.toObject());
  },

  // --- calendar views ------------------------------------------------------

  async daily(dateStr: string, technicianId?: string): Promise<DaySchedule> {
    await dbConnect();
    const { start, end } = dayRange(parseDate(dateStr));
    const jobs = await findScheduledJobs(start, end, technicianId);
    return { date: dateStr, jobs };
  },

  async weekly(dateStr: string, technicianId?: string): Promise<DaySchedule[]> {
    await dbConnect();
    const anchor = parseDate(dateStr);
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + mondayOffset);

    const days: DaySchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const { start, end } = dayRange(d);
      days.push({
        date: dateKey(d),
        jobs: await findScheduledJobs(start, end, technicianId),
      });
    }
    return days;
  },

  async monthly(
    dateStr: string,
    technicianId?: string,
  ): Promise<DaySchedule[]> {
    await dbConnect();
    const anchor = parseDate(dateStr);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Fetch the whole month once, then bucket by day.
    const monthStart = new Date(first);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 1);
    const all = await findScheduledJobs(monthStart, monthEnd, technicianId);

    const byDay = new Map<string, ScheduledJob[]>();
    for (const job of all) {
      if (!job.scheduledDate) continue;
      const key = dateKey(new Date(job.scheduledDate));
      const list = byDay.get(key) ?? [];
      list.push(job);
      byDay.set(key, list);
    }

    const days: DaySchedule[] = [];
    for (let i = 1; i <= lastDay; i++) {
      const key = dateKey(new Date(year, month, i));
      days.push({ date: key, jobs: byDay.get(key) ?? [] });
    }
    return days;
  },

  async getSchedule(
    view: CalendarView,
    dateStr: string,
    technicianId?: string,
  ): Promise<DaySchedule | DaySchedule[]> {
    if (view === calendarView.daily)
      return schedulingService.daily(dateStr, technicianId);
    if (view === calendarView.weekly)
      return schedulingService.weekly(dateStr, technicianId);
    return schedulingService.monthly(dateStr, technicianId);
  },
};

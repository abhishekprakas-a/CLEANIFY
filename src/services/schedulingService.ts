import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto } from "@/lib/serialize";
import { applyJobTransition } from "@/lib/jobWorkflow";
import {
  assignmentStatus,
  bookingStatus,
  calendarView,
  jobStatus,
  roles,
  schedulingPolicy,
  terminalJobStatuses,
  userStatus,
  type CalendarView,
  type JobStatus,
} from "@/constants";
import {
  bookingModel,
  jobAssignmentModel,
  jobModel,
  userModel,
} from "@/models";
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

// --- mapping ---------------------------------------------------------------

interface PopulatedRef {
  _id: unknown;
  customerName?: string;
  mobileNumber?: string;
  name?: string;
}

function toScheduledJob(doc: Record<string, unknown>): ScheduledJob {
  const customer = doc.customer as PopulatedRef | undefined;
  const tech = doc.assignedTechnician as PopulatedRef | undefined;
  return {
    id: String(doc._id),
    jobCode: String(doc.jobCode),
    status: doc.status as JobStatus,
    scheduledDate: doc.scheduledDate
      ? new Date(doc.scheduledDate as string).toISOString()
      : undefined,
    scheduledTime: (doc.scheduledTime as string) || undefined,
    customer: customer?._id
      ? {
          id: String(customer._id),
          customerName: customer.customerName ?? "",
          mobileNumber: customer.mobileNumber ?? "",
        }
      : undefined,
    assignedTechnician: tech?._id
      ? { id: String(tech._id), name: tech.name ?? "" }
      : undefined,
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
  if (technicianId) filter.assignedTechnician = technicianId;

  const docs = await jobModel
    .find(filter)
    .sort({ scheduledDate: 1, scheduledTime: 1 })
    .populate("customer", "customerName mobileNumber")
    .populate("assignedTechnician", "name")
    .lean();

  return docs.map((d) => toScheduledJob(d as Record<string, unknown>));
}

// --- service ---------------------------------------------------------------

export const schedulingService = {
  /**
   * Detect a scheduling conflict: another non-terminal job for the same
   * technician on the same day (and same time slot when the policy requires it).
   */
  async findConflict(
    technicianId: string,
    date: Date,
    time: string | undefined,
    excludeJobId?: string,
  ): Promise<Job | null> {
    const { start, end } = dayRange(date);
    const filter: Record<string, unknown> = {
      assignedTechnician: technicianId,
      status: { $nin: terminalJobStatuses },
      scheduledDate: { $gte: start, $lt: end },
    };
    if (excludeJobId) filter._id = { $ne: excludeJobId };
    if (schedulingPolicy.blockSameSlot && time) filter.scheduledTime = time;

    const conflict = await jobModel.findOne(filter).lean();
    return conflict ? toDto<Job>(conflict) : null;
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
    const docs = await jobModel
      .find({
        assignedTechnician: technicianId,
        status: { $nin: terminalJobStatuses },
        scheduledDate: { $gte: start, $lt: end },
      })
      .populate("customer", "customerName mobileNumber")
      .populate("assignedTechnician", "name")
      .lean();

    const jobs = docs.map((d) => toScheduledJob(d as Record<string, unknown>));
    return {
      technician: { id: String(tech._id), name: tech.name },
      date: dateStr,
      jobCount: jobs.length,
      maxJobsPerDay: schedulingPolicy.maxJobsPerDay,
      isAvailable: jobs.length < schedulingPolicy.maxJobsPerDay,
      jobs,
    };
  },

  async assertTechnicianAvailable(
    technicianId: string,
    date: Date,
    time: string | undefined,
    excludeJobId?: string,
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
    );
    if (conflict) {
      throw ApiError.conflict(
        `Technician already has job ${conflict.jobCode} at this time`,
      );
    }

    const { start, end } = dayRange(date);
    const sameDay = await jobModel.countDocuments({
      assignedTechnician: technicianId,
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

  /** Assign a technician + (optional) date/time. Moves the job to `assigned`. */
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

    await schedulingService.assertTechnicianAvailable(
      input.technicianId,
      scheduledDate,
      scheduledTime,
      jobId,
    );

    job.scheduledDate = scheduledDate;
    job.scheduledTime = scheduledTime;
    job.assignedTechnician = input.technicianId as never;

    // pending → scheduled → assigned (skip the first hop if already scheduled).
    if (job.status === jobStatus.pending) {
      applyJobTransition(job, jobStatus.scheduled, user.id);
    }
    if (job.status === jobStatus.scheduled) {
      applyJobTransition(job, jobStatus.assigned, user.id, "Assigned");
    }
    await job.save();

    await jobAssignmentModel.create({
      job: job._id,
      technician: input.technicianId,
      assignedBy: user.id,
      assignedAt: new Date(),
      scheduledDate,
      scheduledTime,
      status: assignmentStatus.active,
    });

    await bookingModel.findByIdAndUpdate(job.booking, {
      bookingStatus: bookingStatus.scheduled,
    });

    return toDto<Job>(job.toObject());
  },

  /** Move an assigned job to a different technician (job stays `assigned`). */
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

    await schedulingService.assertTechnicianAvailable(
      input.technicianId,
      job.scheduledDate,
      job.scheduledTime,
      jobId,
    );

    await jobAssignmentModel.updateMany(
      { job: job._id, status: assignmentStatus.active },
      { status: assignmentStatus.reassigned },
    );
    await jobAssignmentModel.create({
      job: job._id,
      technician: input.technicianId,
      assignedBy: user.id,
      assignedAt: new Date(),
      scheduledDate: job.scheduledDate,
      scheduledTime: job.scheduledTime,
      status: assignmentStatus.active,
      note: input.note,
    });

    job.assignedTechnician = input.technicianId as never;
    job.statusHistory.push({
      status: jobStatus.assigned,
      at: new Date(),
      by: user.id,
      note: input.note ?? "Reassigned",
    } as never);
    await job.save();

    return toDto<Job>(job.toObject());
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
    if (job.assignedTechnician) {
      await schedulingService.assertTechnicianAvailable(
        String(job.assignedTechnician),
        input.scheduledDate,
        scheduledTime,
        jobId,
      );
    }

    job.scheduledDate = input.scheduledDate;
    job.scheduledTime = scheduledTime;
    job.statusHistory.push({
      status: job.status,
      at: new Date(),
      by: user.id,
      note: input.note ?? "Rescheduled",
    } as never);
    await job.save();

    await jobAssignmentModel.updateMany(
      { job: job._id, status: assignmentStatus.active },
      { scheduledDate: input.scheduledDate, scheduledTime },
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

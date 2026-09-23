import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { recordAudit } from "@/lib/audit";
import { applyJobTransition } from "@/lib/jobWorkflow";
import {
  approvalStatus,
  isDayCheckType,
  jobStatus,
  minCompletionPhotos,
  notificationType,
  photoCategory,
  roles,
  submissionStatus,
  submissionType,
  userStatus,
  type SubmissionType,
} from "@/constants";
import {
  jobModel,
  jobSubmissionModel,
  photoModel,
  userModel,
} from "@/models";
import { inAppNotificationService } from "./inAppNotificationService";
import type {
  CreateSubmissionInput,
  SubmissionQueryInput,
} from "@/schemas/submissionSchema";
import type {
  DayCheckState,
  Submission,
  SessionUser,
  WorkDayStatus,
} from "@/types";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const dayCheckLabel: Record<string, string> = {
  startOfDay: "Start-of-day check",
  endOfDay: "End-of-day (base) check",
};

// --- mapping ---------------------------------------------------------------

interface Ref {
  _id?: unknown;
  name?: string;
  jobCode?: string;
  customer?: { customerName?: string };
}

function mapSubmission(doc: Record<string, unknown>): Submission {
  const job = doc.jobId as (Ref & { customer?: Ref }) | undefined;
  const by = doc.submittedBy as Ref | undefined;
  const reviewer = doc.reviewedBy as Ref | undefined;
  const photos = (doc.photos as Ref[] | undefined) ?? [];
  return {
    id: String(doc._id),
    type: String(doc.type),
    status: String(doc.status),
    submittedAt: doc.submittedAt
      ? new Date(doc.submittedAt as string).toISOString()
      : new Date(doc.createdAt as string).toISOString(),
    reviewedAt: doc.reviewedAt
      ? new Date(doc.reviewedAt as string).toISOString()
      : undefined,
    declineReason: (doc.declineReason as string) || undefined,
    details: (doc.details as Record<string, unknown>) || undefined,
    job: job?._id
      ? {
          id: String(job._id),
          jobCode: String(job.jobCode ?? ""),
          customerName: (job.customer as { customerName?: string } | undefined)
            ?.customerName,
        }
      : undefined,
    submittedBy: by?._id
      ? { id: String(by._id), name: by.name ?? "" }
      : undefined,
    reviewedBy: reviewer?._id
      ? { id: String(reviewer._id), name: reviewer.name ?? "" }
      : undefined,
    photos: photos
      .filter((p) => p?._id)
      .map((p) => ({
        id: String(p._id),
        photoType: String((p as { photoType?: string }).photoType ?? ""),
        photoUrl: String((p as { photoUrl?: string }).photoUrl ?? ""),
      })),
  };
}

// --- helpers ---------------------------------------------------------------

/**
 * Admins + the job's supervisor — the people who may approve / are notified.
 * Scoped to the submission's realm: a dev/test submission only reaches dev
 * admins, a real submission only reaches real admins — so test activity never
 * pings the real admin.
 */
/**
 * Realm filter fragment. Dev realm = accounts explicitly flagged `isDev:true`;
 * real realm = everything else (including legacy records with no `isDev` field),
 * so the existing production flow is completely unaffected.
 */
function realmFilter(isDev: boolean): Record<string, unknown> {
  return isDev ? { isDev: true } : { isDev: { $ne: true } };
}

async function approverIds(
  job: { supervisor?: unknown },
  isDev: boolean,
): Promise<{ admins: string[]; supervisor?: string }> {
  const admins = await userModel
    .find({ role: roles.admin, status: userStatus.active, ...realmFilter(isDev) })
    .select("_id")
    .lean();
  return {
    admins: admins.map((a) => String(a._id)),
    supervisor: job.supervisor ? String(job.supervisor) : undefined,
  };
}

/** Whether a user is a dev/test account. */
async function isDevUser(userId: string): Promise<boolean> {
  const u = await userModel.findById(userId).select("isDev").lean();
  return Boolean(u?.isDev);
}

function canApprove(
  user: SessionUser,
  job: { supervisor?: unknown },
): boolean {
  if (user.role === roles.admin) return true;
  return Boolean(job.supervisor) && String(job.supervisor) === user.id;
}

// --- service ---------------------------------------------------------------

export const submissionService = {
  /**
   * Technician submits a pre-work / completion evidence bundle. Validates the
   * job state + required photo categories, links the photos, moves the job into
   * the matching "pending approval" state and notifies the approvers.
   */
  async submit(
    jobId: string,
    input: CreateSubmissionInput,
    user: SessionUser,
  ): Promise<Submission> {
    await dbConnect();
    const job = await jobModel.findById(jobId);
    if (!job) throw ApiError.notFound("Job not found");

    const type = input.type as SubmissionType;

    // Only an assigned technician (or an admin) may submit.
    if (
      user.role === roles.technician &&
      !job.assignedTechnicians.some((t) => String(t) === user.id)
    ) {
      throw ApiError.forbidden("This job is not assigned to you");
    }

    // State gate.
    if (type === submissionType.preWork && job.status !== jobStatus.reachedSite) {
      throw ApiError.unprocessable(
        "Pre-work can only be submitted after reaching the site",
      );
    }
    if (
      type === submissionType.completion &&
      job.status !== jobStatus.cleaningInProgress
    ) {
      throw ApiError.unprocessable(
        "Completion can only be submitted while work is in progress",
      );
    }

    // Load + validate the attached photos (must belong to this job).
    const photos = await photoModel
      .find({ _id: { $in: input.photoIds }, jobId: job._id })
      .lean();
    if (photos.length !== input.photoIds.length) {
      throw ApiError.badRequest("Some photos were not found for this job");
    }

    const cats = new Set(photos.map((p) => p.photoType));
    if (type === submissionType.preWork) {
      // Per-site pre-work is now just "before cleaning" photos (machinery +
      // uniform moved to the day-level start/end checks).
      const beforeCount = photos.filter(
        (p) => p.photoType === photoCategory.before,
      ).length;
      if (beforeCount < 1) {
        throw ApiError.unprocessable(
          "At least one before-cleaning photo is required",
        );
      }
      // A work remark is mandatory on the before/reached-site submission.
      const remark =
        typeof input.details?.remark === "string"
          ? input.details.remark.trim()
          : "";
      if (!remark) {
        throw ApiError.unprocessable("A work remark is required");
      }
    } else {
      const completionCount = photos.filter(
        (p) =>
          p.photoType === photoCategory.completion ||
          p.photoType === photoCategory.after,
      ).length;
      if (completionCount < minCompletionPhotos) {
        throw ApiError.unprocessable(
          `At least ${minCompletionPhotos} completion photos are required`,
        );
      }
    }

    // Dev/test submissions are isolated from real admins (test sandbox).
    const dev = await isDevUser(user.id);

    // Create the submission and link the photos.
    const submission = await jobSubmissionModel.create({
      jobId: job._id,
      type,
      submittedBy: user.id,
      submittedAt: new Date(),
      photos: input.photoIds,
      details: input.details,
      status: submissionStatus.pending,
      isDev: dev,
    });
    await photoModel.updateMany(
      { _id: { $in: input.photoIds } },
      { $set: { submissionId: submission._id } },
    );

    // Move the job into the matching pending-approval state.
    const nextStatus =
      type === submissionType.preWork
        ? jobStatus.preWorkPendingApproval
        : jobStatus.completionPendingApproval;
    applyJobTransition(job, nextStatus, user.id, `${type} submitted`);
    await job.save();

    // Notify approvers (admins + supervisor) — scoped to the submission's realm.
    const { admins, supervisor } = await approverIds(job, dev);
    const recipients = supervisor ? [...admins, supervisor] : admins;
    const label = type === submissionType.preWork ? "Pre-work" : "Completion";
    await inAppNotificationService.emitMany(
      recipients.filter((id) => id !== user.id),
      {
        type:
          type === submissionType.preWork
            ? notificationType.preWorkSubmitted
            : notificationType.completionSubmitted,
        jobId: String(job._id),
        message: `${label} check submitted for ${job.jobCode} — needs approval`,
        url: "/work-approvals",
        push: { title: `${label} needs approval` },
      },
    );

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: `submission.${type}.submit`,
      entityType: "job",
      entityId: String(job._id),
      meta: { submissionId: String(submission._id), photos: photos.length },
    });

    return submissionService.getById(String(submission._id), user);
  },

  async getById(id: string, user: SessionUser): Promise<Submission> {
    await dbConnect();
    const doc = await jobSubmissionModel
      .findById(id)
      .populate({ path: "jobId", select: "jobCode customer", populate: { path: "customer", select: "customerName" } })
      .populate("submittedBy", "name")
      .populate("reviewedBy", "name")
      .populate("photos", "photoType photoUrl")
      .lean();
    if (!doc) throw ApiError.notFound("Submission not found");
    // Technicians can only see their own submissions.
    if (
      user.role === roles.technician &&
      String((doc as { submittedBy?: { _id?: unknown } }).submittedBy?._id) !==
        user.id
    ) {
      throw ApiError.forbidden();
    }
    return mapSubmission(doc as Record<string, unknown>);
  },

  async list(
    query: SubmissionQueryInput,
    caller: SessionUser,
  ): Promise<Submission[]> {
    await dbConnect();
    // Realm scoping: a dev admin sees only dev/test submissions, a real admin
    // sees only real ones — so test activity stays hidden from real admins.
    const filter: Record<string, unknown> = {
      ...realmFilter(await isDevUser(caller.id)),
    };
    if (query.status !== "all") filter.status = query.status;
    if (query.jobId) filter.jobId = query.jobId;
    const docs = await jobSubmissionModel
      .find(filter)
      .sort({ status: 1, createdAt: -1 })
      .limit(200)
      .populate({ path: "jobId", select: "jobCode customer", populate: { path: "customer", select: "customerName" } })
      .populate("submittedBy", "name")
      .populate("reviewedBy", "name")
      .populate("photos", "photoType photoUrl")
      .lean();
    return docs.map((d) => mapSubmission(d as Record<string, unknown>));
  },

  async pendingCount(caller: SessionUser): Promise<number> {
    await dbConnect();
    return jobSubmissionModel.countDocuments({
      status: submissionStatus.pending,
      ...realmFilter(await isDevUser(caller.id)),
    });
  },

  async approve(id: string, user: SessionUser): Promise<Submission> {
    await dbConnect();
    const submission = await jobSubmissionModel.findById(id);
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.status !== submissionStatus.pending) {
      throw ApiError.conflict(`This submission is already ${submission.status}`);
    }

    // Day-level check (start/end of day) — no job, admin-only, no job transition.
    if (isDayCheckType(submission.type)) {
      if (user.role !== roles.admin) {
        throw ApiError.forbidden("Only an admin can approve this check");
      }
      submission.status = submissionStatus.approved;
      submission.reviewedBy = user.id as never;
      submission.reviewedAt = new Date();
      await submission.save();

      await inAppNotificationService.emit({
        userId: String(submission.submittedBy),
        type: notificationType.dayCheckApproved,
        message: `${dayCheckLabel[submission.type] ?? "Check"} approved${
          submission.type === submissionType.startOfDay
            ? " — you can start your sites"
            : ""
        }`,
        url: "/technician",
        push: { title: "Check approved" },
      });
      await recordAudit({
        actor: user.id,
        actorName: user.name,
        action: `submission.${submission.type}.approve`,
        entityType: "user",
        entityId: String(submission.submittedBy),
        meta: { submissionId: String(submission._id) },
      });
      return submissionService.getById(id, user);
    }

    const job = await jobModel.findById(submission.jobId);
    if (!job) throw ApiError.notFound("Job not found");
    if (!canApprove(user, job)) {
      throw ApiError.forbidden("Only an admin or the supervisor can approve");
    }

    submission.status = submissionStatus.approved;
    submission.reviewedBy = user.id as never;
    submission.reviewedAt = new Date();
    await submission.save();

    // Reflect the approval on the photos so the technician sees them approved.
    await photoModel.updateMany(
      { submissionId: submission._id },
      {
        $set: {
          approvalStatus: approvalStatus.approved,
          reviewedBy: user.id,
          reviewedAt: new Date(),
        },
      },
    );

    // Advance the job past the gate.
    const nextStatus =
      submission.type === submissionType.preWork
        ? jobStatus.cleaningInProgress
        : jobStatus.completed;
    applyJobTransition(job, nextStatus, user.id, `${submission.type} approved`);
    await job.save();

    const label =
      submission.type === submissionType.preWork ? "Pre-work" : "Completion";
    await inAppNotificationService.emit({
      userId: String(submission.submittedBy),
      type:
        submission.type === submissionType.preWork
          ? notificationType.preWorkApproved
          : notificationType.completionApproved,
      jobId: String(job._id),
      message: `${label} approved for ${job.jobCode}${
        submission.type === submissionType.preWork
          ? " — you can start work"
          : ""
      }`,
      url: `/technician/jobs/${String(job._id)}`,
      push: { title: `${label} approved` },
    });

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: `submission.${submission.type}.approve`,
      entityType: "job",
      entityId: String(job._id),
      meta: { submissionId: String(submission._id) },
    });

    return submissionService.getById(id, user);
  },

  async decline(
    id: string,
    reason: string,
    user: SessionUser,
  ): Promise<Submission> {
    await dbConnect();
    const submission = await jobSubmissionModel.findById(id);
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.status !== submissionStatus.pending) {
      throw ApiError.conflict(`This submission is already ${submission.status}`);
    }

    // Day-level check — no job, admin-only, no job transition; worker re-uploads.
    if (isDayCheckType(submission.type)) {
      if (user.role !== roles.admin) {
        throw ApiError.forbidden("Only an admin can decline this check");
      }
      submission.status = submissionStatus.declined;
      submission.reviewedBy = user.id as never;
      submission.reviewedAt = new Date();
      submission.declineReason = reason;
      await submission.save();

      await inAppNotificationService.emit({
        userId: String(submission.submittedBy),
        type: notificationType.dayCheckDeclined,
        message: `${dayCheckLabel[submission.type] ?? "Check"} declined: ${reason}`,
        url: "/technician",
        push: { title: "Check declined" },
      });
      await recordAudit({
        actor: user.id,
        actorName: user.name,
        action: `submission.${submission.type}.decline`,
        entityType: "user",
        entityId: String(submission.submittedBy),
        meta: { submissionId: String(submission._id), reason },
      });
      return submissionService.getById(id, user);
    }

    const job = await jobModel.findById(submission.jobId);
    if (!job) throw ApiError.notFound("Job not found");
    if (!canApprove(user, job)) {
      throw ApiError.forbidden("Only an admin or the supervisor can decline");
    }

    submission.status = submissionStatus.declined;
    submission.reviewedBy = user.id as never;
    submission.reviewedAt = new Date();
    submission.declineReason = reason;
    await submission.save();

    // Reflect the decline on the photos (shows as rejected with the reason).
    await photoModel.updateMany(
      { submissionId: submission._id },
      {
        $set: {
          approvalStatus: approvalStatus.rejected,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
      },
    );

    // Send the job back so the technician can redo the step.
    const backStatus =
      submission.type === submissionType.preWork
        ? jobStatus.reachedSite
        : jobStatus.cleaningInProgress;
    applyJobTransition(job, backStatus, user.id, `declined: ${reason}`);
    await job.save();

    const label =
      submission.type === submissionType.preWork ? "Pre-work" : "Completion";
    await inAppNotificationService.emit({
      userId: String(submission.submittedBy),
      type:
        submission.type === submissionType.preWork
          ? notificationType.preWorkDeclined
          : notificationType.completionDeclined,
      jobId: String(job._id),
      message: `${label} declined for ${job.jobCode}: ${reason}`,
      url: `/technician/jobs/${String(job._id)}`,
      push: { title: `${label} declined` },
    });

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: `submission.${submission.type}.decline`,
      entityType: "job",
      entityId: String(job._id),
      meta: { submissionId: String(submission._id), reason },
    });

    return submissionService.getById(id, user);
  },

  /**
   * Technician submits a day-level check (start-of-day at base, or end-of-day on
   * return). Requires a machinery + a uniform/mask photo. No job is involved;
   * only admins approve. One check of each type per day.
   */
  async submitDayCheck(
    type: SubmissionType,
    photoIds: string[],
    user: SessionUser,
  ): Promise<Submission> {
    await dbConnect();
    if (!isDayCheckType(type)) {
      throw ApiError.badRequest("Invalid day-check type");
    }

    const existing = await jobSubmissionModel
      .findOne({
        submittedBy: user.id,
        type,
        createdAt: { $gte: startOfToday() },
        status: { $in: [submissionStatus.pending, submissionStatus.approved] },
      })
      .lean();
    if (existing) {
      throw ApiError.conflict(
        `You've already submitted the ${dayCheckLabel[type] ?? "check"} today`,
      );
    }

    const photos = await photoModel
      .find({
        _id: { $in: photoIds },
        uploadedBy: user.id,
        jobId: { $exists: false },
      })
      .lean();
    if (photos.length !== photoIds.length) {
      throw ApiError.badRequest("Some photos were not found");
    }
    const cats = new Set(photos.map((p) => p.photoType));
    if (!cats.has(photoCategory.machinery)) {
      throw ApiError.unprocessable("A machinery photo is required");
    }
    if (!cats.has(photoCategory.uniformMask)) {
      throw ApiError.unprocessable("A uniform / mask photo is required");
    }

    const dev = await isDevUser(user.id);
    const submission = await jobSubmissionModel.create({
      type,
      submittedBy: user.id,
      submittedAt: new Date(),
      photos: photoIds,
      status: submissionStatus.pending,
      isDev: dev,
    });
    await photoModel.updateMany(
      { _id: { $in: photoIds } },
      { $set: { submissionId: submission._id } },
    );

    const { admins } = await approverIds({}, dev);
    await inAppNotificationService.emitMany(
      admins.filter((id) => id !== user.id),
      {
        type: notificationType.dayCheckSubmitted,
        message: `${dayCheckLabel[type]} submitted by ${user.name} — needs approval`,
        url: "/work-approvals",
        push: { title: "Check needs approval" },
      },
    );
    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: `submission.${type}.submit`,
      entityType: "user",
      entityId: user.id,
      meta: { submissionId: String(submission._id) },
    });
    return submissionService.getById(String(submission._id), user);
  },

  /** The technician's day-level check state for today (drives the route UI). */
  async today(user: SessionUser): Promise<WorkDayStatus> {
    await dbConnect();
    const subs = await jobSubmissionModel
      .find({
        submittedBy: user.id,
        type: { $in: [submissionType.startOfDay, submissionType.endOfDay] },
        createdAt: { $gte: startOfToday() },
      })
      .sort({ createdAt: -1 })
      .lean();

    const toState = (t: string): DayCheckState => {
      const s = subs.find((x) => x.type === t);
      if (!s) return { status: "none" };
      return {
        id: String(s._id),
        status: s.status as DayCheckState["status"],
        declineReason: s.declineReason,
        submittedAt: s.submittedAt
          ? new Date(s.submittedAt).toISOString()
          : new Date(s.createdAt).toISOString(),
      };
    };

    const start = toState(submissionType.startOfDay);
    const end = toState(submissionType.endOfDay);
    return { start, end, sitesUnlocked: start.status === "approved" };
  },

  /** Gate helper: has this technician's start-of-day check been approved today? */
  async hasApprovedStartToday(userId: string): Promise<boolean> {
    await dbConnect();
    const exists = await jobSubmissionModel.exists({
      submittedBy: userId,
      type: submissionType.startOfDay,
      status: submissionStatus.approved,
      createdAt: { $gte: startOfToday() },
    });
    return Boolean(exists);
  },
};

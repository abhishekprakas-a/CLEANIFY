import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { recordAudit } from "@/lib/audit";
import { realmFilter, isDevUser } from "@/lib/realm";
import {
  lateRequestStatus,
  notificationType,
  roles,
  routes,
  userStatus,
} from "@/constants";
import { jobModel, lateRequestModel, userModel } from "@/models";
import { inAppNotificationService } from "./inAppNotificationService";
import type {
  CreateLateRequestInput,
  LateRequestQueryInput,
} from "@/schemas/lateRequestSchema";
import type { LateRequest, SessionUser } from "@/types";

interface Ref {
  _id?: unknown;
  name?: string;
  jobCode?: string;
}

function mapLateRequest(doc: Record<string, unknown>): LateRequest {
  const by = doc.requestedBy as Ref | undefined;
  const job = doc.jobId as Ref | undefined;
  const reviewer = doc.reviewedBy as Ref | undefined;
  return {
    id: String(doc._id),
    reason: String(doc.reason ?? ""),
    status: String(doc.status),
    requestedBy: by?._id
      ? { id: String(by._id), name: by.name ?? "" }
      : undefined,
    job: job?._id
      ? { id: String(job._id), jobCode: String(job.jobCode ?? "") }
      : undefined,
    adminNote: (doc.adminNote as string) || undefined,
    reviewedBy: reviewer?._id
      ? { id: String(reviewer._id), name: reviewer.name ?? "" }
      : undefined,
    reviewedAt: doc.reviewedAt
      ? new Date(doc.reviewedAt as string).toISOString()
      : undefined,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string).toISOString()
      : new Date().toISOString(),
  };
}

/** Active admins in the request's realm (dev requests only reach dev admins). */
async function adminIds(isDev: boolean): Promise<string[]> {
  const admins = await userModel
    .find({ role: roles.admin, status: userStatus.active, ...realmFilter(isDev) })
    .select("_id")
    .lean();
  return admins.map((a) => String(a._id));
}

export const lateRequestService = {
  /** Technician/supervisor raises a late request; admins are notified. */
  async create(
    input: CreateLateRequestInput,
    user: SessionUser,
  ): Promise<LateRequest> {
    await dbConnect();

    // If tied to a job, verify it exists (and, for a technician, is theirs).
    if (input.jobId) {
      const job = await jobModel.findById(input.jobId).select("assignedTechnicians");
      if (!job) throw ApiError.notFound("Job not found");
      if (
        user.role === roles.technician &&
        !job.assignedTechnicians.some((t) => String(t) === user.id)
      ) {
        throw ApiError.forbidden("This job is not assigned to you");
      }
    }

    const dev = await isDevUser(user.id);
    const doc = await lateRequestModel.create({
      requestedBy: user.id,
      jobId: input.jobId || undefined,
      reason: input.reason,
      status: lateRequestStatus.pending,
      isDev: dev,
    });

    const admins = await adminIds(dev);
    await inAppNotificationService.emitMany(
      admins.filter((id) => id !== user.id),
      {
        type: notificationType.lateRequestRaised,
        jobId: input.jobId || undefined,
        message: `${user.name} raised a late request: ${input.reason}`,
        url: routes.admin.lateRequests,
        push: { title: "Late request" },
      },
    );

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "lateRequest.raise",
      entityType: "lateRequest",
      entityId: String(doc._id),
      meta: { jobId: input.jobId, reason: input.reason },
    });

    return lateRequestService.getById(String(doc._id), user);
  },

  async getById(id: string, _user: SessionUser): Promise<LateRequest> {
    await dbConnect();
    const doc = await lateRequestModel
      .findById(id)
      .populate("requestedBy", "name")
      .populate("jobId", "jobCode")
      .populate("reviewedBy", "name")
      .lean();
    if (!doc) throw ApiError.notFound("Late request not found");
    return mapLateRequest(doc as Record<string, unknown>);
  },

  /** Admin queue — realm-scoped so test requests stay hidden from real admins. */
  async list(
    query: LateRequestQueryInput,
    caller: SessionUser,
  ): Promise<LateRequest[]> {
    await dbConnect();
    const filter: Record<string, unknown> = {
      ...realmFilter(await isDevUser(caller.id)),
    };
    if (query.status !== "all") filter.status = query.status;
    const docs = await lateRequestModel
      .find(filter)
      .sort({ status: 1, createdAt: -1 })
      .limit(200)
      .populate("requestedBy", "name")
      .populate("jobId", "jobCode")
      .populate("reviewedBy", "name")
      .lean();
    return docs.map((d) => mapLateRequest(d as Record<string, unknown>));
  },

  async pendingCount(caller: SessionUser): Promise<number> {
    await dbConnect();
    return lateRequestModel.countDocuments({
      status: lateRequestStatus.pending,
      ...realmFilter(await isDevUser(caller.id)),
    });
  },

  /** Admin acknowledges a late request; the requester is notified. */
  async review(
    id: string,
    note: string | undefined,
    user: SessionUser,
  ): Promise<LateRequest> {
    await dbConnect();
    const doc = await lateRequestModel.findById(id);
    if (!doc) throw ApiError.notFound("Late request not found");
    if (doc.status !== lateRequestStatus.pending) {
      throw ApiError.conflict("This late request is already reviewed");
    }

    doc.status = lateRequestStatus.acknowledged;
    doc.reviewedBy = user.id as never;
    doc.reviewedAt = new Date();
    if (note) doc.adminNote = note;
    await doc.save();

    await inAppNotificationService.emit({
      userId: String(doc.requestedBy),
      type: notificationType.lateRequestReviewed,
      jobId: doc.jobId ? String(doc.jobId) : undefined,
      message: `Your late request was acknowledged by ${user.name}${
        note ? `: ${note}` : ""
      }`,
      url: routes.technician.home,
      push: { title: "Late request acknowledged" },
    });

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "lateRequest.review",
      entityType: "lateRequest",
      entityId: String(doc._id),
      meta: { note },
    });

    return lateRequestService.getById(id, user);
  },
};

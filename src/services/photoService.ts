import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto, toDtoList } from "@/lib/serialize";
import {
  createPresignedUpload,
  deleteObject,
  getObjectSize,
  publicUrlForKey,
  type PresignResult,
} from "@/lib/storageClient";
import { recordAudit } from "@/lib/audit";
import {
  approvalStatus,
  doneJobStatuses,
  photoKind,
  roles,
  type JobStatus,
} from "@/constants";
import { jobModel, photoModel } from "@/models";
import type {
  ConfirmPhotoInput,
  PresignPhotoInput,
} from "@/schemas/photoSchema";
import type { JobPhotoGroup, Photo, SessionUser } from "@/types";

/** Hard server-side cap on a stored photo (the client compresses to ~5 MB). */
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function extFromContentType(contentType: string): string {
  return contentType.split("/")[1]?.toLowerCase() ?? "jpg";
}

async function assertOwnedJob(jobId: string, user: SessionUser) {
  const job = await jobModel.findById(jobId);
  if (!job) throw ApiError.notFound("Job not found");
  if (!job.assignedTechnicians.some((t) => String(t) === user.id)) {
    throw ApiError.forbidden("This job is not assigned to you");
  }
  return job;
}

export const photoService = {
  /**
   * Return a presigned PUT URL for a direct browser→storage upload. No DB row is
   * created yet — the record is written by `confirm` once the upload succeeds, so
   * failed/retried uploads never leave orphan photos.
   */
  async presign(
    input: PresignPhotoInput,
    user: SessionUser,
  ): Promise<PresignResult> {
    await dbConnect();
    await assertOwnedJob(input.jobId, user);

    const ext = extFromContentType(input.contentType);
    const s3Key = `jobs/${input.jobId}/${input.photoType}/${Date.now()}-${Math.round(
      Math.random() * 1e6,
    )}.${ext}`;
    return createPresignedUpload(s3Key, input.contentType);
  },

  /** Create the photo record after a successful upload, and attach it to the job. */
  async confirm(input: ConfirmPhotoInput, user: SessionUser): Promise<Photo> {
    await dbConnect();
    await assertOwnedJob(input.jobId, user);

    // The key must belong to this job/gate (the client echoes what presign gave).
    const expectedPrefix = `jobs/${input.jobId}/${input.photoType}/`;
    if (!input.s3Key.startsWith(expectedPrefix)) {
      throw ApiError.badRequest("Invalid upload key");
    }

    // The presigned PUT can't bound object size, so verify the *actual* stored
    // size here and reject/clean up anything over the cap. Fails open only if
    // the store doesn't allow HEAD (then the client-reported size still applies).
    const actualSize = await getObjectSize(input.s3Key).catch(() => undefined);
    if (actualSize != null && actualSize > MAX_PHOTO_BYTES) {
      await deleteObject(input.s3Key).catch(() => {});
      throw ApiError.unprocessable("Photo exceeds the 8 MB limit");
    }

    const photo = await photoModel.create({
      jobId: input.jobId,
      photoType: input.photoType,
      // Derived server-side from the validated key — never trust a client URL.
      photoUrl: publicUrlForKey(input.s3Key),
      s3Key: input.s3Key,
      uploadedBy: user.id,
      approvalStatus: approvalStatus.pending,
      metadata: {
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        width: input.width,
        height: input.height,
        originalName: input.originalName,
        geo: input.geo,
      },
    });

    // Only the legacy before/after kinds mirror onto the job arrays; the v2
    // submission categories are linked via `submissionId` instead.
    if (
      input.photoType === photoKind.before ||
      input.photoType === photoKind.after
    ) {
      const field =
        input.photoType === photoKind.before ? "beforePhotos" : "afterPhotos";
      await jobModel.findByIdAndUpdate(input.jobId, {
        $addToSet: { [field]: photo._id },
      });
    }

    return toDto<Photo>(photo.toObject());
  },

  /**
   * Delete a photo: detach it from its job, remove the DB row, and delete the
   * S3 object. The uploader can delete their own photos (admins can delete any)
   * as long as the job isn't already completed.
   */
  async remove(id: string, user: SessionUser): Promise<void> {
    await dbConnect();
    const photo = await photoModel.findById(id);
    if (!photo) throw ApiError.notFound("Photo not found");

    const isOwner = String(photo.uploadedBy) === user.id;
    const isAdmin = user.role === roles.admin;
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden("You can only delete photos you uploaded");
    }

    const job = await jobModel.findById(photo.jobId);
    if (job && doneJobStatuses.includes(job.status as JobStatus) && !isAdmin) {
      throw ApiError.unprocessable(
        "This job is completed; its photos can't be changed",
      );
    }

    if (
      job &&
      (photo.photoType === photoKind.before ||
        photo.photoType === photoKind.after)
    ) {
      const field =
        photo.photoType === photoKind.before ? "beforePhotos" : "afterPhotos";
      await jobModel.findByIdAndUpdate(job._id, {
        $pull: { [field]: photo._id },
      });
    }
    await photoModel.deleteOne({ _id: photo._id });
    // Best-effort object delete — the DB row is the source of truth, so an
    // orphaned object is harmless if this fails.
    try {
      await deleteObject(photo.s3Key);
    } catch {
      /* ignore */
    }

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "photo.delete",
      entityType: "photo",
      entityId: id,
      meta: { jobId: String(photo.jobId), photoType: photo.photoType },
    });
  },

  async listByJob(jobId: string): Promise<Photo[]> {
    await dbConnect();
    const docs = await photoModel.find({ jobId }).sort({ createdAt: 1 }).lean();
    return toDtoList<Photo>(docs);
  },

  /**
   * Read-only gallery for admins: recent jobs that have photos, each with its
   * before/after sets. Replaces the old approval queue now that photos are no
   * longer gated.
   */
  async gallery(limit = 60): Promise<JobPhotoGroup[]> {
    await dbConnect();
    const recent = await photoModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(400)
      .lean();
    if (recent.length === 0) return [];

    const order: string[] = [];
    const byJob = new Map<string, { before: Photo[]; after: Photo[] }>();
    for (const p of recent) {
      const jid = String(p.jobId);
      if (!byJob.has(jid)) {
        byJob.set(jid, { before: [], after: [] });
        order.push(jid);
      }
      const group = byJob.get(jid)!;
      const dto = toDto<Photo>(p);
      if (p.photoType === photoKind.before) group.before.push(dto);
      else group.after.push(dto);
    }

    const jobIds = order.slice(0, limit);
    const jobs = await jobModel
      .find({ _id: { $in: jobIds } })
      .populate("customer", "customerName")
      .lean();
    const jobById = new Map(jobs.map((j) => [String(j._id), j]));

    return jobIds.map((jid) => {
      const j = jobById.get(jid);
      const group = byJob.get(jid)!;
      const customer = j?.customer as { customerName?: string } | undefined;
      return {
        job: {
          id: jid,
          jobCode: j?.jobCode ?? "—",
          status: (j?.status ?? "pending") as JobPhotoGroup["job"]["status"],
          customerName: customer?.customerName ?? "—",
        },
        before: group.before,
        after: group.after,
      };
    });
  },
};

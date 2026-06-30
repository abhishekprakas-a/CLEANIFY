import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto, toDtoList } from "@/lib/serialize";
import { createPresignedUpload, type PresignResult } from "@/lib/storageClient";
import { applyJobTransition } from "@/lib/jobWorkflow";
import { recordAudit } from "@/lib/audit";
import { approvalStatus, jobStatus, photoKind } from "@/constants";
import { jobModel, photoModel } from "@/models";
import type {
  ConfirmPhotoInput,
  PresignPhotoInput,
  RejectPhotoInput,
} from "@/schemas/photoSchema";
import type { PendingReviewItem, Photo, SessionUser } from "@/types";

function extFromContentType(contentType: string): string {
  return contentType.split("/")[1]?.toLowerCase() ?? "jpg";
}

async function assertOwnedJob(jobId: string, user: SessionUser) {
  const job = await jobModel.findById(jobId);
  if (!job) throw ApiError.notFound("Job not found");
  if (String(job.assignedTechnician) !== user.id) {
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

    const photo = await photoModel.create({
      jobId: input.jobId,
      photoType: input.photoType,
      photoUrl: input.photoUrl,
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

    const field =
      input.photoType === photoKind.before ? "beforePhotos" : "afterPhotos";
    await jobModel.findByIdAndUpdate(input.jobId, {
      $addToSet: { [field]: photo._id },
    });

    return toDto<Photo>(photo.toObject());
  },

  async listByJob(jobId: string): Promise<Photo[]> {
    await dbConnect();
    const docs = await photoModel.find({ jobId }).sort({ createdAt: 1 }).lean();
    return toDtoList<Photo>(docs);
  },

  /** Jobs awaiting before/after photo approval, with their gate's photos. */
  async pendingReview(): Promise<PendingReviewItem[]> {
    await dbConnect();
    const jobs = await jobModel
      .find({
        status: {
          $in: [
            jobStatus.beforePhotoPendingApproval,
            jobStatus.afterPhotoPendingApproval,
          ],
        },
      })
      .sort({ updatedAt: 1 })
      .populate("customer", "customerName")
      .lean();

    return Promise.all(
      jobs.map(async (job) => {
        const gate =
          job.status === jobStatus.beforePhotoPendingApproval
            ? photoKind.before
            : photoKind.after;
        const photos = await photoModel
          .find({ jobId: job._id, photoType: gate })
          .sort({ createdAt: 1 })
          .lean();
        const customer = job.customer as { customerName?: string } | undefined;
        return {
          job: {
            id: String(job._id),
            jobCode: job.jobCode,
            status: job.status as PendingReviewItem["job"]["status"],
            customerName: customer?.customerName ?? "—",
            scheduledDate: job.scheduledDate
              ? new Date(job.scheduledDate).toISOString()
              : undefined,
          },
          gate,
          photos: toDtoList<Photo>(photos),
        };
      }),
    );
  },

  /**
   * Approve a photo. When all photos of the gating kind are approved, advance:
   *   beforePhotoPendingApproval → cleaningInProgress
   *   afterPhotoPendingApproval  → completed
   */
  async approve(id: string, user: SessionUser): Promise<Photo> {
    await dbConnect();
    const photo = await photoModel.findById(id);
    if (!photo) throw ApiError.notFound("Photo not found");

    photo.approvalStatus = approvalStatus.approved;
    photo.reviewedBy = user.id as never;
    photo.reviewedAt = new Date();
    await photo.save();

    await photoService.advanceGate(String(photo.jobId), photo.photoType, user);
    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "photo.approve",
      entityType: "photo",
      entityId: id,
      meta: { jobId: String(photo.jobId), photoType: photo.photoType },
    });
    return toDto<Photo>(photo.toObject());
  },

  /**
   * Reject a photo and send the job back for re-work:
   *   beforePhotoPendingApproval → reachedSite (retake before photos)
   *   afterPhotoPendingApproval  → cleaningInProgress (retake after photos)
   */
  async reject(
    id: string,
    input: RejectPhotoInput,
    user: SessionUser,
  ): Promise<Photo> {
    await dbConnect();
    const photo = await photoModel.findById(id);
    if (!photo) throw ApiError.notFound("Photo not found");

    photo.approvalStatus = approvalStatus.rejected;
    photo.rejectionReason = input.rejectionReason;
    photo.reviewedBy = user.id as never;
    photo.reviewedAt = new Date();
    await photo.save();

    const job = await jobModel.findById(photo.jobId);
    if (!job) return toDto<Photo>(photo.toObject());

    if (job.status === jobStatus.beforePhotoPendingApproval) {
      applyJobTransition(
        job,
        jobStatus.reachedSite,
        user.id,
        input.rejectionReason,
      );
      await job.save();
    } else if (job.status === jobStatus.afterPhotoPendingApproval) {
      applyJobTransition(
        job,
        jobStatus.cleaningInProgress,
        user.id,
        input.rejectionReason,
      );
      await job.save();
    }

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "photo.reject",
      entityType: "photo",
      entityId: id,
      meta: { reason: input.rejectionReason },
    });

    return toDto<Photo>(photo.toObject());
  },

  /** Advance the job's gate when every photo of `photoType` is approved. */
  async advanceGate(
    jobId: string,
    photoType: string,
    user: SessionUser,
  ): Promise<void> {
    const job = await jobModel.findById(jobId);
    if (!job) return;

    const pending = await photoModel.countDocuments({
      jobId,
      photoType,
      approvalStatus: { $ne: approvalStatus.approved },
    });
    if (pending > 0) return;

    if (
      photoType === photoKind.before &&
      job.status === jobStatus.beforePhotoPendingApproval
    ) {
      applyJobTransition(job, jobStatus.cleaningInProgress, user.id);
      await job.save();
    } else if (
      photoType === photoKind.after &&
      job.status === jobStatus.afterPhotoPendingApproval
    ) {
      applyJobTransition(job, jobStatus.completed, user.id);
      await job.save();
    }
  },
};

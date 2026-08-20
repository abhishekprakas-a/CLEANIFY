import { dbConnect } from "@/lib/dbConnect";
import { toDtoList } from "@/lib/serialize";
import { notificationModel } from "@/models";
import { notificationService } from "./notificationService";
import type { NotificationType } from "@/constants";
import type { AppNotification, SessionUser } from "@/types";

export interface EmitInput {
  userId: string;
  type: NotificationType;
  message: string;
  jobId?: string;
  url?: string;
  /** Also send a web-push (title defaults to a generic app label). */
  push?: { title: string } | boolean;
}

export const inAppNotificationService = {
  /**
   * Create one in-app notification and (best-effort) fire a matching web-push.
   * Never throws — a notification failure must not fail the triggering action.
   */
  async emit(input: EmitInput): Promise<void> {
    try {
      await dbConnect();
      await notificationModel.create({
        userId: input.userId,
        type: input.type,
        jobId: input.jobId,
        message: input.message,
        url: input.url,
        isRead: false,
      });
    } catch {
      /* swallow — see above */
    }

    if (input.push) {
      const title =
        typeof input.push === "object" ? input.push.title : "Cleanify";
      await notificationService
        .notifyUser(input.userId, {
          title,
          body: input.message,
          url: input.url,
          tag: input.jobId ? `job-${input.jobId}` : undefined,
        })
        .catch(() => 0);
    }
  },

  /** Emit the same notification to many users (e.g. all admins). */
  async emitMany(userIds: string[], input: Omit<EmitInput, "userId">): Promise<void> {
    await Promise.all(
      [...new Set(userIds)].map((userId) =>
        inAppNotificationService.emit({ ...input, userId }),
      ),
    );
  },

  async list(
    user: SessionUser,
    opts: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<AppNotification[]> {
    await dbConnect();
    const filter: Record<string, unknown> = { userId: user.id };
    if (opts.unreadOnly) filter.isRead = false;
    const docs = await notificationModel
      .find(filter)
      .sort({ isRead: 1, createdAt: -1 })
      .limit(Math.min(opts.limit ?? 20, 100))
      .lean();
    return toDtoList<AppNotification>(docs);
  },

  async unreadCount(user: SessionUser): Promise<number> {
    await dbConnect();
    return notificationModel.countDocuments({
      userId: user.id,
      isRead: false,
    });
  },

  async markRead(user: SessionUser, id: string): Promise<void> {
    await dbConnect();
    await notificationModel.updateOne(
      { _id: id, userId: user.id },
      { $set: { isRead: true } },
    );
  },

  async markAllRead(user: SessionUser): Promise<void> {
    await dbConnect();
    await notificationModel.updateMany(
      { userId: user.id, isRead: false },
      { $set: { isRead: true } },
    );
  },
};

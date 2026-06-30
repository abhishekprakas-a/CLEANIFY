import webpush from "web-push";
import { dbConnect } from "@/lib/dbConnect";
import { env } from "@/lib/env";
import { pushSubscriptionModel } from "@/models";
import type { PushSubscriptionInput } from "@/schemas/pushSchema";
import type { SessionUser } from "@/types";

let configured = false;

/** Lazily configure web-push with VAPID details. Returns false if not set up. */
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  webpush.setVapidDetails(
    env.vapidSubject,
    env.vapidPublicKey,
    env.vapidPrivateKey,
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export const notificationService = {
  isEnabled(): boolean {
    return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
  },

  /** Save (or refresh) a device subscription for a user. */
  async subscribe(
    input: PushSubscriptionInput,
    user: SessionUser,
    userAgent?: string,
  ): Promise<void> {
    await dbConnect();
    await pushSubscriptionModel.updateOne(
      { endpoint: input.endpoint },
      {
        $set: {
          user: user.id,
          endpoint: input.endpoint,
          keys: input.keys,
          userAgent,
        },
      },
      { upsert: true },
    );
  },

  async unsubscribe(endpoint: string): Promise<void> {
    await dbConnect();
    await pushSubscriptionModel.deleteOne({ endpoint });
  },

  /** Send a push to every device of a user. Prunes dead subscriptions. */
  async notifyUser(userId: string, payload: PushPayload): Promise<number> {
    if (!ensureConfigured()) return 0;
    await dbConnect();

    const subs = await pushSubscriptionModel.find({ user: userId }).lean();
    let sent = 0;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            JSON.stringify(payload),
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await pushSubscriptionModel.deleteOne({ endpoint: sub.endpoint });
          }
        }
      }),
    );

    return sent;
  },
};

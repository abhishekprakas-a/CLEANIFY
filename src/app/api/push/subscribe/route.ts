import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireUser } from "@/lib/authGuard";
import { notificationService } from "@/services";
import {
  pushSubscriptionSchema,
  unsubscribeSchema,
} from "@/schemas/pushSchema";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const input = pushSubscriptionSchema.parse(await req.json());
    await notificationService.subscribe(
      input,
      user,
      req.headers.get("user-agent") ?? undefined,
    );
    return ok({ subscribed: true });
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    await requireUser();
    const { endpoint } = unsubscribeSchema.parse(await req.json());
    await notificationService.unsubscribe(endpoint);
    return ok({ unsubscribed: true });
  });
}

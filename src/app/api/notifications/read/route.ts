import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { inAppNotificationService } from "@/services";
import { roles } from "@/constants";

/** Mark one notification read (body: {id}), or all read (body: {all:true}). */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin, roles.technician]);
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      all?: boolean;
    };
    if (body.all) {
      await inAppNotificationService.markAllRead(user);
    } else if (body.id) {
      await inAppNotificationService.markRead(user, body.id);
    }
    const unread = await inAppNotificationService.unreadCount(user);
    return ok({ unread });
  });
}

import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { inAppNotificationService } from "@/services";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin, roles.technician]);
    const sp = req.nextUrl.searchParams;
    const unreadOnly = sp.get("unread") === "1";
    const [items, unread] = await Promise.all([
      inAppNotificationService.list(user, { unreadOnly }),
      inAppNotificationService.unreadCount(user),
    ]);
    return ok({ items, unread });
  });
}

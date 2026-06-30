import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { dashboardService } from "@/services";
import { roles } from "@/constants";

export async function GET() {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const summary = await dashboardService.adminSummary();
    return ok(summary);
  });
}

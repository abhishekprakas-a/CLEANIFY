import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { dashboardService } from "@/services";
import { roles } from "@/constants";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const summary = await dashboardService.technicianSummary(user);
    return ok(summary);
  });
}

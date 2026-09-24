import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { schedulingService } from "@/services";
import { roles } from "@/constants";

/** Active job count per technician — used to show crew load when assigning. */
export async function GET() {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const workload = await schedulingService.workload(user);
    return ok(workload);
  });
}

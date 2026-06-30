import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { attendanceService } from "@/services";
import { roles } from "@/constants";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const record = await attendanceService.today(user);
    return ok(record);
  });
}

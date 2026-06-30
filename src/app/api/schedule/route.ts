import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { schedulingService } from "@/services";
import { scheduleQuerySchema } from "@/schemas/jobSchema";
import { permissions } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(permissions.jobsRead);
    const sp = req.nextUrl.searchParams;
    const { view, date, technicianId } = scheduleQuerySchema.parse({
      view: sp.get("view") ?? undefined,
      date: sp.get("date") ?? undefined,
      technicianId: sp.get("technicianId") ?? undefined,
    });
    const schedule = await schedulingService.getSchedule(
      view,
      date,
      technicianId,
    );
    return ok(schedule);
  });
}

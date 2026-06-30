import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { schedulingService } from "@/services";
import { availabilityQuerySchema } from "@/schemas/jobSchema";
import { permissions } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(permissions.jobsAssign);
    const sp = req.nextUrl.searchParams;
    const { technicianId, date } = availabilityQuerySchema.parse({
      technicianId: sp.get("technicianId") ?? undefined,
      date: sp.get("date") ?? undefined,
    });
    const availability = await schedulingService.availability(
      technicianId,
      date,
    );
    return ok(availability);
  });
}

import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole, requirePermission } from "@/lib/authGuard";
import { jobService } from "@/services";
import { updateJobSchema } from "@/schemas/jobSchema";
import { permissions, roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin, roles.technician]);
    const job = await jobService.getById(params.id, user);
    return ok(job);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.jobsWrite);
    const input = updateJobSchema.parse(await req.json());
    const job = await jobService.update(params.id, input, user);
    return ok(job);
  });
}

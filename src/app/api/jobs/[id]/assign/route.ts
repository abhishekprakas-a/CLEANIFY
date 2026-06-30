import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { schedulingService } from "@/services";
import { assignJobSchema } from "@/schemas/jobSchema";
import { permissions } from "@/constants";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.jobsAssign);
    const input = assignJobSchema.parse(await req.json());
    const job = await schedulingService.assign(params.id, input, user);
    return ok(job);
  });
}

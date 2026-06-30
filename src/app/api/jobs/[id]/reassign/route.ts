import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { schedulingService } from "@/services";
import { reassignJobSchema } from "@/schemas/jobSchema";
import { permissions } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.jobsAssign);
    const input = reassignJobSchema.parse(await req.json());
    const job = await schedulingService.reassign(params.id, input, user);
    return ok(job);
  });
}

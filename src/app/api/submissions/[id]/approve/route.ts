import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { submissionService } from "@/services";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    // Admin or the job's supervisor (a technician) — enforced in the service.
    const user = await requireRole([roles.admin, roles.technician]);
    const submission = await submissionService.approve(params.id, user);
    return ok(submission);
  });
}

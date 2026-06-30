import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { jobService } from "@/services";
import { transitionJobSchema } from "@/schemas/jobSchema";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin, roles.technician]);
    const input = transitionJobSchema.parse(await req.json());
    const job = await jobService.transition(params.id, input, user);
    return ok(job);
  });
}

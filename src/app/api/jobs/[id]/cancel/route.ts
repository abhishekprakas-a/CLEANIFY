import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { jobService } from "@/services";
import { cancelJobSchema } from "@/schemas/jobSchema";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const input = cancelJobSchema.parse(await req.json());
    const job = await jobService.cancel(params.id, input, user);
    return ok(job);
  });
}

import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { jobIntakeService } from "@/services";
import { jobIntakeSchema } from "@/schemas/jobSchema";
import { roles } from "@/constants";

/** Unified "Job Card" intake: create customer (if new) + booking + job at once. */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const input = jobIntakeSchema.parse(await req.json());
    const job = await jobIntakeService.create(input, user);
    return created(job);
  });
}

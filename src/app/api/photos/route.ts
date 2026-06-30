import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { ApiError } from "@/lib/apiError";
import { photoService } from "@/services";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin, roles.technician]);
    const job = req.nextUrl.searchParams.get("job");
    if (!job) throw ApiError.badRequest("job query param is required");
    const photos = await photoService.listByJob(job);
    return ok(photos);
  });
}

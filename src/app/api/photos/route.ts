import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { ApiError } from "@/lib/apiError";
import { photoService } from "@/services";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin, roles.technician]);
    const sp = req.nextUrl.searchParams;
    // Day-level (job-less) check photos for the current worker: ?scope=workday&type=machinery
    if (sp.get("scope") === "workday") {
      const type = sp.get("type");
      if (!type) throw ApiError.badRequest("type query param is required");
      return ok(await photoService.listWorkdayPhotos(user, type));
    }
    const job = sp.get("job");
    if (!job) throw ApiError.badRequest("job query param is required");
    return ok(await photoService.listByJob(job));
  });
}

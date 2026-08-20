import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { submissionService } from "@/services";
import { submissionQuerySchema } from "@/schemas/submissionSchema";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const sp = req.nextUrl.searchParams;
    // Lightweight badge count (no populate).
    if (sp.get("count") === "1") {
      return ok({ count: await submissionService.pendingCount() });
    }
    const query = submissionQuerySchema.parse({
      status: sp.get("status") ?? undefined,
      jobId: sp.get("jobId") ?? undefined,
    });
    const items = await submissionService.list(query);
    return ok(items);
  });
}

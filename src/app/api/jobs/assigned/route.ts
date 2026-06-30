import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { parseListQuery } from "@/lib/pagination";
import { jobService } from "@/services";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const query = parseListQuery(req.nextUrl.searchParams);
    const { items, meta } = await jobService.listForTechnician(user.id, query);
    return ok(items, meta);
  });
}

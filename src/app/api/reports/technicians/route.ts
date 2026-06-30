import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { reportService } from "@/services";
import { permissions } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(permissions.reportsView);
    const sp = req.nextUrl.searchParams;
    const data = await reportService.technicianPerformance({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return ok(data);
  });
}

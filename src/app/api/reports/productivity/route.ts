import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { reportService } from "@/services";
import { permissions } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(permissions.reportsView);
    const yearParam = req.nextUrl.searchParams.get("year");
    const year = Number(yearParam) || new Date().getFullYear();
    const data = await reportService.monthlyProductivity(year);
    return ok(data);
  });
}

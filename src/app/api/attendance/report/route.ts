import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { attendanceService } from "@/services";
import { attendanceReportSchema } from "@/schemas/attendanceSchema";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const sp = req.nextUrl.searchParams;
    const input = attendanceReportSchema.parse({
      period: sp.get("period") ?? undefined,
      date: sp.get("date") ?? undefined,
      userId: sp.get("userId") ?? undefined,
    });
    const report = await attendanceService.getReport(
      input.period,
      input.date,
      input.userId,
    );
    return ok(report);
  });
}

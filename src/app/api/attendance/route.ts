import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { parseListQuery } from "@/lib/pagination";
import { attendanceService } from "@/services";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const query = parseListQuery(req.nextUrl.searchParams);
    const sp = req.nextUrl.searchParams;
    const { items, meta } = await attendanceService.list(query, {
      userId: sp.get("userId") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return ok(items, meta);
  });
}

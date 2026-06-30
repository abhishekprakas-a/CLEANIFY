import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { attendanceService } from "@/services";
import { checkOutSchema } from "@/schemas/attendanceSchema";
import { roles } from "@/constants";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const input = checkOutSchema.parse(await req.json().catch(() => ({})));
    const record = await attendanceService.checkOut(input, user);
    return ok(record);
  });
}

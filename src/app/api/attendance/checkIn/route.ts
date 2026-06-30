import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { attendanceService } from "@/services";
import { checkInSchema } from "@/schemas/attendanceSchema";
import { roles } from "@/constants";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const input = checkInSchema.parse(await req.json().catch(() => ({})));
    const record = await attendanceService.checkIn(input, user);
    return created(record);
  });
}

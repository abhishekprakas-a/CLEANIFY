import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { bookingService } from "@/services";
import { rescheduleBookingSchema } from "@/schemas/bookingSchema";
import { permissions } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.bookingsWrite);
    const input = rescheduleBookingSchema.parse(await req.json());
    const booking = await bookingService.reschedule(params.id, input, user);
    return ok(booking);
  });
}

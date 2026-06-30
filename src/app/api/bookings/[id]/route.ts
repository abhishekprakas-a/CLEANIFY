import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { bookingService } from "@/services";
import { updateBookingSchema } from "@/schemas/bookingSchema";
import { permissions } from "@/constants";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    await requirePermission(permissions.bookingsRead);
    const booking = await bookingService.getById(params.id);
    return ok(booking);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    await requirePermission(permissions.bookingsWrite);
    const input = updateBookingSchema.parse(await req.json());
    const booking = await bookingService.update(params.id, input);
    return ok(booking);
  });
}

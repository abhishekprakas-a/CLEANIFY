import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { bookingService } from "@/services";
import { permissions } from "@/constants";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    await requirePermission(permissions.bookingsRead);
    const booking = await bookingService.history(params.id);
    return ok(booking);
  });
}

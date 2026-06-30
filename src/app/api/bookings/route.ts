import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created, ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { parseListQuery } from "@/lib/pagination";
import { bookingService } from "@/services";
import {
  bookingQuerySchema,
  createBookingSchema,
} from "@/schemas/bookingSchema";
import { permissions } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(permissions.bookingsRead);
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp);
    const { status, from, to } = bookingQuerySchema.parse({
      status: sp.get("status") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    const { items, meta } = await bookingService.list(query, {
      status,
      from,
      to,
    });
    return ok(items, meta);
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.bookingsWrite);
    const input = createBookingSchema.parse(await req.json());
    const booking = await bookingService.create(input, user);
    return created(booking);
  });
}

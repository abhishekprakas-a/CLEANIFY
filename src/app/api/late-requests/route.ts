import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created, ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { lateRequestService } from "@/services";
import {
  createLateRequestSchema,
  lateRequestQuerySchema,
} from "@/schemas/lateRequestSchema";
import { roles } from "@/constants";

/** Admin: list late requests (badge count via ?count=1). */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const sp = req.nextUrl.searchParams;
    if (sp.get("count") === "1") {
      return ok({ count: await lateRequestService.pendingCount(user) });
    }
    const query = lateRequestQuerySchema.parse({
      status: sp.get("status") ?? undefined,
    });
    return ok(await lateRequestService.list(query, user));
  });
}

/** Technician/supervisor (or admin): raise a late request. */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician, roles.admin]);
    const input = createLateRequestSchema.parse(await req.json());
    return created(await lateRequestService.create(input, user));
  });
}

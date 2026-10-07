import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { lateRequestService } from "@/services";
import { reviewLateRequestSchema } from "@/schemas/lateRequestSchema";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

/** Admin acknowledges a late request (with an optional note). */
export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const { note } = reviewLateRequestSchema.parse(await req.json());
    return ok(await lateRequestService.review(params.id, note, user));
  });
}

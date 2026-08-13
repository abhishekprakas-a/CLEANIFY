import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { photoService } from "@/services";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

/** Delete a photo. Technicians can remove their own; admins can remove any. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician, roles.admin]);
    await photoService.remove(params.id, user);
    return ok({ deleted: true });
  });
}

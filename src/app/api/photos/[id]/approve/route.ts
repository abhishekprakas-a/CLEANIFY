import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { photoService } from "@/services";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const photo = await photoService.approve(params.id, user);
    return ok(photo);
  });
}

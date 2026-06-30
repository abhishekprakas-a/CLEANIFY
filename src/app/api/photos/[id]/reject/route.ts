import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { photoService } from "@/services";
import { rejectPhotoSchema } from "@/schemas/photoSchema";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const input = rejectPhotoSchema.parse(await req.json());
    const photo = await photoService.reject(params.id, input, user);
    return ok(photo);
  });
}

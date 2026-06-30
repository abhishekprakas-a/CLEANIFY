import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { photoService } from "@/services";
import { confirmPhotoSchema } from "@/schemas/photoSchema";
import { roles } from "@/constants";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const input = confirmPhotoSchema.parse(await req.json());
    const photo = await photoService.confirm(input, user);
    return ok(photo);
  });
}

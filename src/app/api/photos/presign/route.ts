import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { photoService } from "@/services";
import { presignPhotoSchema } from "@/schemas/photoSchema";
import { roles } from "@/constants";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const input = presignPhotoSchema.parse(await req.json());
    const result = await photoService.presign(input, user);
    return ok(result);
  });
}

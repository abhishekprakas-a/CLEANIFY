import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { authService } from "@/services";
import { updateUserSchema } from "@/schemas/authSchema";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const input = updateUserSchema.parse(await req.json());
    const user = await authService.updateUser(params.id, input);
    return ok(user);
  });
}

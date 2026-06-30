import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { authService } from "@/services";
import { resetPasswordSchema } from "@/schemas/authSchema";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const input = resetPasswordSchema.parse(await req.json());
    await authService.resetPassword(input);
    return ok({ message: "Password updated. You can now sign in." });
  });
}

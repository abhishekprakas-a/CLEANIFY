import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { getRequestContext } from "@/lib/authGuard";
import { enforceRateLimit } from "@/lib/rateLimit";
import { authService } from "@/services";
import { resetPasswordSchema } from "@/schemas/authSchema";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const ctx = getRequestContext();
    // 10 attempts / 10 min per IP — the token is unguessable; this is abuse control.
    enforceRateLimit(`reset:${ctx.ip ?? "?"}`, 10, 600_000);
    const input = resetPasswordSchema.parse(await req.json());
    await authService.resetPassword(input);
    return ok({ message: "Password updated. You can now sign in." });
  });
}

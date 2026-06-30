import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { getRequestContext } from "@/lib/authGuard";
import { enforceRateLimit } from "@/lib/rateLimit";
import { authService } from "@/services";
import { forgotPasswordSchema } from "@/schemas/authSchema";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const input = forgotPasswordSchema.parse(await req.json());
    const { ip } = getRequestContext();
    enforceRateLimit(`forgot:${ip ?? "?"}`, 3, 10 * 60_000);
    await authService.forgotPassword(input);
    // Always return success to avoid leaking which emails are registered.
    return ok({
      message: "If an account exists, a reset link has been sent.",
    });
  });
}

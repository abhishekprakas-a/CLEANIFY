import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { setAccessCookie, setRefreshCookie } from "@/lib/cookies";
import { getRequestContext } from "@/lib/authGuard";
import { enforceRateLimit } from "@/lib/rateLimit";
import { authService } from "@/services";
import { loginSchema } from "@/schemas/authSchema";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const input = loginSchema.parse(await req.json());
    const ctx = getRequestContext(input.remember);
    // 5 attempts / minute per IP+email to slow brute force.
    enforceRateLimit(`login:${ctx.ip ?? "?"}:${input.email}`, 5, 60_000);
    const result = await authService.login(input, ctx);

    setAccessCookie(result.accessToken, result.rememberDays);
    setRefreshCookie(result.refreshToken, result.rememberDays);

    return ok({ user: result.user });
  });
}

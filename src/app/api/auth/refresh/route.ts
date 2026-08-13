import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { ApiError } from "@/lib/apiError";
import {
  getRefreshCookie,
  setAccessCookie,
  setRefreshCookie,
  clearAuthCookies,
} from "@/lib/cookies";
import { getRequestContext } from "@/lib/authGuard";
import { enforceRateLimit } from "@/lib/rateLimit";
import { authService } from "@/services";

export async function POST() {
  return handleRoute(async () => {
    const ctx = getRequestContext();
    // Generous per-IP cap — legit clients refresh on token expiry only.
    enforceRateLimit(`refresh:${ctx.ip ?? "?"}`, 120, 60_000);

    const refreshToken = getRefreshCookie();
    if (!refreshToken) {
      clearAuthCookies();
      throw ApiError.unauthenticated("No active session");
    }

    try {
      const result = await authService.refresh(refreshToken, ctx);
      setAccessCookie(result.accessToken, result.rememberDays);
      setRefreshCookie(result.refreshToken, result.rememberDays);
      return ok({ user: result.user });
    } catch (error) {
      clearAuthCookies();
      throw error;
    }
  });
}

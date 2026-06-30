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
import { authService } from "@/services";

export async function POST() {
  return handleRoute(async () => {
    const refreshToken = getRefreshCookie();
    if (!refreshToken) {
      clearAuthCookies();
      throw ApiError.unauthenticated("No active session");
    }

    try {
      const ctx = getRequestContext();
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

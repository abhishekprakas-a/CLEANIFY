import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { clearAuthCookies } from "@/lib/cookies";
import { getSessionUser } from "@/lib/authGuard";
import { authService } from "@/services";

export async function POST() {
  return handleRoute(async () => {
    const user = await getSessionUser();
    await authService.logout(user?.sessionId);
    clearAuthCookies();
    return ok({ loggedOut: true });
  });
}

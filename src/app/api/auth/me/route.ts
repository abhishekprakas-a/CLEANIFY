import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireUser } from "@/lib/authGuard";
import { authService } from "@/services";

export async function GET() {
  return handleRoute(async () => {
    const sessionUser = await requireUser();
    const user = await authService.me(sessionUser);
    return ok({ user });
  });
}

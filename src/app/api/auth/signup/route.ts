import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created } from "@/lib/apiResponse";
import { getRequestContext } from "@/lib/authGuard";
import { enforceRateLimit } from "@/lib/rateLimit";
import { authService } from "@/services";
import { signupSchema } from "@/schemas/authSchema";

/**
 * Public self-registration. Creates a technician account pending admin
 * verification — no session is opened, so the response carries no tokens.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const input = signupSchema.parse(await req.json());
    const ctx = getRequestContext();
    // 5 signups / 10 min per IP to curb abuse.
    enforceRateLimit(`signup:${ctx.ip ?? "?"}`, 5, 600_000);
    await authService.signup(input);
    return created({ pending: true });
  });
}

import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { submissionService } from "@/services";
import { roles } from "@/constants";

/** The current technician's day-level check state (start-of-day / at-base). */
export async function GET() {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    return ok(await submissionService.today(user));
  });
}

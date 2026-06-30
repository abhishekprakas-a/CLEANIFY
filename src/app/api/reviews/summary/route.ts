import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { reviewService } from "@/services";
import { permissions } from "@/constants";

export async function GET() {
  return handleRoute(async () => {
    await requirePermission(permissions.reviewsRead);
    const summary = await reviewService.summary();
    return ok(summary);
  });
}

import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { photoService } from "@/services";
import { permissions } from "@/constants";

export async function GET() {
  return handleRoute(async () => {
    await requirePermission(permissions.photosApprove);
    const items = await photoService.pendingReview();
    return ok(items);
  });
}

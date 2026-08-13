import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { photoService } from "@/services";
import { roles } from "@/constants";

/** Read-only before/after photo gallery for admins. */
export async function GET() {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const items = await photoService.gallery();
    return ok(items);
  });
}

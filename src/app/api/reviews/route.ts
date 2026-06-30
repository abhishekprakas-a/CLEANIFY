import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created, ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { parseListQuery } from "@/lib/pagination";
import { reviewService } from "@/services";
import { createReviewSchema } from "@/schemas/reviewSchema";
import { permissions } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(permissions.reviewsRead);
    const query = parseListQuery(req.nextUrl.searchParams);
    const technicianId =
      req.nextUrl.searchParams.get("technicianId") ?? undefined;
    const { items, meta } = await reviewService.list(query, { technicianId });
    return ok(items, meta);
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.reviewsWrite);
    const input = createReviewSchema.parse(await req.json());
    const review = await reviewService.create(input, user);
    return created(review);
  });
}

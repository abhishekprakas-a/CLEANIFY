import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created, ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { parseListQuery } from "@/lib/pagination";
import { jobService } from "@/services";
import { createJobSchema } from "@/schemas/jobSchema";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const query = parseListQuery(req.nextUrl.searchParams);
    const sp = req.nextUrl.searchParams;
    const { items, meta } = await jobService.list(query, {
      status: sp.get("status") ?? undefined,
      technician: sp.get("technician") ?? undefined,
      date: sp.get("date") ?? undefined,
    });
    return ok(items, meta);
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin]);
    const input = createJobSchema.parse(await req.json());
    const job = await jobService.createFromBooking(input, user);
    return created(job);
  });
}

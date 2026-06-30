import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { dbConnect } from "@/lib/dbConnect";
import { parseListQuery, buildMeta } from "@/lib/pagination";
import { toDtoList } from "@/lib/serialize";
import { auditLogModel } from "@/models";
import { roles } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    await dbConnect();
    const query = parseListQuery(req.nextUrl.searchParams);
    const action = req.nextUrl.searchParams.get("action") ?? undefined;
    const filter = action ? { action } : {};

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      auditLogModel.countDocuments(filter),
    ]);

    return ok(toDtoList(docs), buildMeta(total, query.page, query.limit));
  });
}

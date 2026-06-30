import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created, ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { authService } from "@/services";
import { createUserSchema } from "@/schemas/authSchema";
import { dbConnect } from "@/lib/dbConnect";
import { userModel } from "@/models";
import { toDtoList } from "@/lib/serialize";
import { parseListQuery } from "@/lib/pagination";
import { roles } from "@/constants";
import type { User } from "@/types";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    await dbConnect();
    const query = parseListQuery(req.nextUrl.searchParams);
    const role = req.nextUrl.searchParams.get("role");
    const filter = role ? { role } : {};
    const docs = await userModel
      .find(filter)
      .sort(query.sort)
      .limit(query.limit)
      .lean();
    return ok(toDtoList<User>(docs));
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    await requireRole([roles.admin]);
    const input = createUserSchema.parse(await req.json());
    const user = await authService.createUser(input);
    return created(user);
  });
}

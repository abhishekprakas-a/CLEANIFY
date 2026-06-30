import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created, ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { parseListQuery } from "@/lib/pagination";
import { customerService } from "@/services";
import {
  createCustomerSchema,
  customerQuerySchema,
} from "@/schemas/customerSchema";
import { permissions } from "@/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(permissions.customersRead);
    const query = parseListQuery(req.nextUrl.searchParams);
    const { status } = customerQuerySchema.parse({
      status: req.nextUrl.searchParams.get("status") ?? undefined,
    });
    const { items, meta } = await customerService.list(query, { status });
    return ok(items, meta);
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.customersWrite);
    const input = createCustomerSchema.parse(await req.json());
    const customer = await customerService.create(input, user);
    return created(customer);
  });
}

import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requirePermission } from "@/lib/authGuard";
import { customerService } from "@/services";
import { updateCustomerSchema } from "@/schemas/customerSchema";
import { permissions } from "@/constants";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    await requirePermission(permissions.customersRead);
    const customer = await customerService.getById(params.id);
    return ok(customer);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    await requirePermission(permissions.customersWrite);
    const input = updateCustomerSchema.parse(await req.json());
    const customer = await customerService.update(params.id, input);
    return ok(customer);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requirePermission(permissions.customersWrite);
    const result = await customerService.remove(params.id, user);
    return ok(result);
  });
}

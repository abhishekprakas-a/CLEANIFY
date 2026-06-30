import { dbConnect } from "@/lib/dbConnect";
import { toDtoList } from "@/lib/serialize";
import {
  defaultRolePermissions,
  type Role,
  type Permission,
} from "@/constants";
import { roleModel } from "@/models";
import type { RoleDto } from "@/types";

/**
 * Small process-level cache of role -> permission keys. Roles change rarely, so
 * this avoids a DB read on every permission check. Invalidated on role updates.
 */
const permissionCache = new Map<string, string[]>();

export const roleService = {
  /**
   * Resolve the permission keys for a role. Reads `roleModel`; falls back to the
   * constants default (so it works before the DB is seeded).
   */
  async getPermissions(roleName: string): Promise<string[]> {
    const cached = permissionCache.get(roleName);
    if (cached) return cached;

    await dbConnect();
    const role = await roleModel.findOne({ name: roleName }).lean();
    const perms =
      role?.permissions ??
      defaultRolePermissions[roleName as Role]?.map((p) => p as Permission) ??
      [];

    permissionCache.set(roleName, perms);
    return perms;
  },

  async hasPermission(roleName: string, permission: string): Promise<boolean> {
    const perms = await roleService.getPermissions(roleName);
    return perms.includes(permission);
  },

  async list(): Promise<RoleDto[]> {
    await dbConnect();
    const docs = await roleModel.find().sort({ name: 1 }).lean();
    return toDtoList<RoleDto>(docs);
  },

  clearCache(): void {
    permissionCache.clear();
  },
};

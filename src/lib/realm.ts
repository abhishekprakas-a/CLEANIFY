import { userModel } from "@/models";

/**
 * Dev/test-sandbox realm helpers. Accounts flagged `isDev:true` form an isolated
 * test area: their staff records, submissions and notifications are only visible
 * to other dev accounts, never to real admins. Real realm = everything not
 * explicitly `isDev:true` (so legacy records with no field stay in the real
 * realm and the production flow is unaffected).
 */
export function realmFilter(isDev: boolean): Record<string, unknown> {
  return isDev ? { isDev: true } : { isDev: { $ne: true } };
}

/** Whether a user id belongs to a dev/test account. */
export async function isDevUser(userId: string): Promise<boolean> {
  const u = await userModel.findById(userId).select("isDev").lean();
  return Boolean(u?.isDev);
}

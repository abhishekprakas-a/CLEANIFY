import { cookies, headers } from "next/headers";
import { ApiError } from "@/lib/apiError";
import { verifyToken } from "@/lib/jwt";
import { env } from "@/lib/env";
import { roleService } from "@/services/roleService";
import type { Role } from "@/constants";
import type { SessionUser } from "@/types";
import type { SessionContext } from "@/services/sessionService";

/**
 * Reads + verifies the access-token cookie. Returns null when absent/invalid.
 * Works in Route Handlers and Server Actions (uses next/headers cookies()).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(env.authCookieName)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Throws UNAUTHENTICATED if there is no valid session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw ApiError.unauthenticated();
  return user;
}

/** Throws UNAUTHENTICATED/FORBIDDEN unless the session has one of the roles. */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw ApiError.forbidden();
  return user;
}

/**
 * Fine-grained guard: throws FORBIDDEN unless the session's role grants the
 * permission. Resolved against `roleModel` (cached) via roleService.
 */
export async function requirePermission(
  permission: string,
): Promise<SessionUser> {
  const user = await requireUser();
  const allowed = await roleService.hasPermission(user.role, permission);
  if (!allowed) throw ApiError.forbidden(`Missing permission: ${permission}`);
  return user;
}

/** Capture the request's user-agent + IP for session bookkeeping. */
export function getRequestContext(remember?: boolean): SessionContext {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  return {
    userAgent: h.get("user-agent") ?? undefined,
    ip,
    remember,
  };
}

import { cookies } from "next/headers";
import { env } from "@/lib/env";

const DAY_SECONDS = 60 * 60 * 24;

/** Path the refresh cookie is scoped to — only sent to the auth endpoints. */
const REFRESH_COOKIE_PATH = "/api/auth";

function baseOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
  };
}

/**
 * Set the access-token cookie. Its max-age tracks the refresh window so the
 * cookie persists across the browser session; the JWT's own `exp` enforces the
 * short access lifetime regardless of cookie age.
 */
export function setAccessCookie(token: string, rememberDays: number): void {
  cookies().set(env.authCookieName, token, {
    ...baseOptions(),
    path: "/",
    maxAge: rememberDays * DAY_SECONDS,
  });
}

export function setRefreshCookie(token: string, rememberDays: number): void {
  cookies().set(env.refreshCookieName, token, {
    ...baseOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: rememberDays * DAY_SECONDS,
  });
}

export function getRefreshCookie(): string | undefined {
  return cookies().get(env.refreshCookieName)?.value;
}

export function clearAuthCookies(): void {
  cookies().set(env.authCookieName, "", {
    ...baseOptions(),
    path: "/",
    maxAge: 0,
  });
  cookies().set(env.refreshCookieName, "", {
    ...baseOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
  });
}

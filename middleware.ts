import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { env } from "@/lib/env";
import { roles, routes } from "@/constants";

/**
 * Edge auth + role gate. Verifies the session JWT and enforces role -> route
 * group rules. Page requests redirect to /login; API requests get 401/403.
 * Service/route handlers re-assert the role as defence in depth.
 */
const technicianPrefixes = ["/technician", "/api/attendance"];
const adminPrefixes = [
  routes.admin.dashboard,
  routes.admin.customers,
  routes.admin.bookings,
  routes.admin.schedule,
  routes.admin.jobs,
  routes.admin.approvals,
  routes.admin.reviews,
  routes.admin.reports,
  routes.admin.staff,
  routes.admin.audit,
  "/api/customers",
  "/api/bookings",
  "/api/reviews",
  "/api/dashboard",
  "/api/reports",
  "/api/users",
  "/api/audit",
  "/api/schedule",
];

function isApi(pathname: string): boolean {
  return pathname.startsWith("/api");
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(env.authCookieName)?.value;
  const user = token ? await verifyToken(token) : null;

  const deny = () => {
    if (isApi(pathname)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHENTICATED", message: "Login required" },
        },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = routes.login;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  };

  if (!user) return deny();

  // Role gating.
  if (startsWithAny(pathname, adminPrefixes) && user.role !== roles.admin) {
    return forbid(pathname, req);
  }
  if (
    startsWithAny(pathname, technicianPrefixes) &&
    user.role !== roles.technician &&
    user.role !== roles.admin
  ) {
    return forbid(pathname, req);
  }

  return NextResponse.next();
}

function forbid(pathname: string, req: NextRequest) {
  if (isApi(pathname)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      },
      { status: 403 },
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = routes.login;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/bookings/:path*",
    "/schedule/:path*",
    "/jobs/:path*",
    "/approvals/:path*",
    "/reviews/:path*",
    "/reports/:path*",
    "/staff/:path*",
    "/audit/:path*",
    "/attendance/:path*",
    "/technician/:path*",
    "/api/((?!health|auth/login|auth/logout|auth/refresh|auth/forgotPassword|auth/resetPassword).*)",
  ],
};

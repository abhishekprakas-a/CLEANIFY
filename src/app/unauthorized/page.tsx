import Link from "next/link";
import { getSessionUser } from "@/lib/authGuard";
import { roleHomeRoute, routes } from "@/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Access denied" };

/**
 * Shown when a signed-in user reaches a page their role can't access (the
 * middleware redirects here instead of bouncing an authenticated user to the
 * login screen). Not gated by middleware, so it always renders.
 */
export default async function UnauthorizedPage() {
  const user = await getSessionUser();
  const home = user ? (roleHomeRoute[user.role] ?? routes.home) : routes.login;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
        🔒
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Access denied</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          You don&apos;t have permission to view this page
          {user ? ` with your ${user.role} account` : ""}.
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={home}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {user ? "Go to your dashboard" : "Sign in"}
        </Link>
        <Link
          href={routes.login}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Sign in as a different user
        </Link>
      </div>
    </main>
  );
}

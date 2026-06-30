import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/loginForm";
import { env } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4">
      <Link
        href="/"
        className="mb-4 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        ← Back to home
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold text-brand-700"
          >
            <span className="text-2xl">💧</span>
            {env.appName}
          </Link>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

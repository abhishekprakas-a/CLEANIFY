import Link from "next/link";
import { SignupForm } from "@/components/auth/signupForm";
import { Logo } from "@/components/brand/logo";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4 py-10">
      <Link
        href="/"
        className="mb-4 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        ← Back to home
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <Logo className="h-10" />
          </Link>
          <p className="mt-3 text-sm text-slate-500">
            Create a technician account
          </p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}

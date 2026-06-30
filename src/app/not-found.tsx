import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <div className="text-5xl font-bold text-brand-600">404</div>
      <p className="text-sm text-slate-500">We couldn&apos;t find that page.</p>
      <Link
        href="/"
        className="text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Go home
      </Link>
    </main>
  );
}

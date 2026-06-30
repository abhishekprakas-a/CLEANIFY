export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <div className="text-4xl">📶</div>
      <h1 className="text-xl font-bold text-slate-800">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-slate-500">
        No internet connection. Your cached jobs are still available, and any
        check-ins or updates you make will sync automatically when you&apos;re
        back online.
      </p>
    </main>
  );
}

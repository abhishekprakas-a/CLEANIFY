"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Shared error-boundary UI for route `error.tsx` files. */
export function ErrorState({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    // Surface to the console / error reporter.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <div className="text-3xl">⚠️</div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="max-w-sm text-sm text-slate-500">
        An unexpected error occurred. You can try again — if it keeps happening,
        contact support.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";

const variantStyle: Record<string, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-slate-800",
};

/** Renders queued toasts (bottom-right) and auto-dismisses them. */
export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white shadow-lg",
            variantStyle[t.variant] ?? variantStyle.info,
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

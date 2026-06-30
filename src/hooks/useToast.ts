"use client";

import { useUiStore } from "@/store/uiStore";

/** Convenience hook to raise toast notifications from anywhere. */
export function useToast() {
  const push = useUiStore((s) => s.pushToast);
  return {
    toast: (message: string, variant?: "success" | "error" | "info") =>
      push(message, variant),
    success: (message: string) => push(message, "success"),
    error: (message: string) => push(message, "error"),
    info: (message: string) => push(message, "info"),
  };
}

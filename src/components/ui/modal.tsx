"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Bare modal shell: dimmed backdrop, centered panel, Escape / backdrop-click to
 * close, body scroll locked while open. Compose content inside.
 */
export function Modal({
  title,
  children,
  onClose,
}: {
  title?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        {title && (
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        )}
        <div className={title ? "mt-2" : ""}>{children}</div>
      </div>
    </div>
  );
}

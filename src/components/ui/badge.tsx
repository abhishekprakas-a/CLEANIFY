import * as React from "react";
import { cn } from "@/lib/cn";
import { statusMeta } from "@/constants";

export function Badge({
  status,
  children,
  className,
}: {
  status?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const meta = status ? statusMeta(status) : null;
  const color = meta?.badgeClass ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        color,
        className,
      )}
    >
      {children ?? meta?.label ?? status}
    </span>
  );
}

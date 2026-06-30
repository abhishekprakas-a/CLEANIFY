import * as React from "react";
import { cn } from "@/lib/cn";
import { jobStatus } from "@/constants";

const statusColors: Record<string, string> = {
  [jobStatus.pending]: "bg-slate-100 text-slate-700",
  [jobStatus.scheduled]: "bg-blue-100 text-blue-700",
  [jobStatus.assigned]: "bg-indigo-100 text-indigo-700",
  [jobStatus.reachedSite]: "bg-amber-100 text-amber-700",
  [jobStatus.beforePhotoPendingApproval]: "bg-purple-100 text-purple-700",
  [jobStatus.cleaningInProgress]: "bg-cyan-100 text-cyan-700",
  [jobStatus.afterPhotoPendingApproval]: "bg-purple-100 text-purple-700",
  [jobStatus.completed]: "bg-green-100 text-green-700",
  [jobStatus.cancelled]: "bg-slate-200 text-slate-500",
};

export function Badge({
  status,
  children,
  className,
}: {
  status?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const color = status
    ? (statusColors[status] ?? "bg-slate-100 text-slate-700")
    : "bg-slate-100 text-slate-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        color,
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}

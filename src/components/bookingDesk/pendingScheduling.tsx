"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { Job } from "@/types";

type PopRef = { name?: string; customerName?: string };
type JobRow = Omit<Job, "customer" | "assignedTechnicians"> & {
  customer?: string | PopRef;
  assignedTechnicians?: (string | PopRef)[];
};

function customerName(ref: unknown): string {
  return typeof ref === "object" && ref
    ? ((ref as PopRef).customerName ?? "—")
    : "—";
}
function fmt(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

/** Jobs that still need a crew assigned (non-terminal, no technicians). */
export function PendingScheduling() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .list<JobRow>(`${routes.api.jobs}?unassigned=1&limit=50`)
      .then(({ items }) => setRows(items))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (rows.length === 0)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        Nothing waiting to be scheduled — every job has a crew. 🎉
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        These jobs have no worker assigned yet. Open one to set the schedule and
        assign a crew.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {j.jobCode}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {customerName(j.customer)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {fmt(j.scheduledDate)}
                  {j.scheduledTime ? ` · ${j.scheduledTime}` : ""}
                </td>
                <td className="px-4 py-3">
                  <Badge status={j.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`${routes.admin.jobs}/${j.id}/edit`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Schedule &amp; assign
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

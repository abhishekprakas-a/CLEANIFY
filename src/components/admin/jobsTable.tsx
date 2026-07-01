"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { allJobStatuses, routes, terminalJobStatuses } from "@/constants";
import type { Job, PaginationMeta, User } from "@/types";

type PopRef = { name?: string; customerName?: string };
type JobRow = Omit<Job, "customer" | "assignedTechnicians"> & {
  customer?: string | PopRef;
  assignedTechnicians?: (string | PopRef)[];
};

const fieldClass = "h-10 rounded-lg border border-slate-300 px-3 text-sm";

function name(ref: unknown, key: "name" | "customerName"): string {
  return typeof ref === "object" && ref
    ? ((ref as Record<string, string>)[key] ?? "—")
    : "—";
}
function crewNames(refs?: (string | PopRef)[]): string {
  const names = (refs ?? [])
    .map((r) => (typeof r === "object" && r ? r.name : undefined))
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}
function fmt(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

export function JobsTable() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<JobRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User[]>(routes.api.technicians)
      .then(setTechnicians)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status, technicianId]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (status) params.set("status", status);
    if (technicianId) params.set("technician", technicianId);
    api
      .list<JobRow>(`${routes.api.jobs}?${params.toString()}`)
      .then(({ items, meta }) => {
        setRows(items);
        setMeta(meta ?? null);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page, status, technicianId]);

  useEffect(load, [load]);

  async function cancelJob(job: JobRow) {
    const reason = prompt("Cancellation reason:");
    if (!reason) return;
    try {
      await api.post(`${routes.api.jobs}/${job.id}/cancel`, { reason });
      toast.success(`${job.jobCode} cancelled`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${fieldClass} capitalize`}
          >
            <option value="">All statuses</option>
            {allJobStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className={fieldClass}
          >
            <option value="">All technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <Link href={routes.admin.jobNew}>
          <Button>+ New job</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No jobs found.
                </td>
              </tr>
            ) : (
              rows.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {j.jobCode}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {name(j.customer, "customerName")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {crewNames(j.assignedTechnicians)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmt(j.scheduledDate)}
                    {j.scheduledTime ? ` · ${j.scheduledTime}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={j.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => cancelJob(j)}
                      disabled={terminalJobStatuses.includes(j.status)}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} jobs
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

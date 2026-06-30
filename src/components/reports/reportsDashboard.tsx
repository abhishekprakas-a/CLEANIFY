"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { ReportChart } from "@/components/reports/reportChart";
import { ExportButtons } from "@/components/reports/exportButtons";
import { api } from "@/hooks/useApi";
import { allJobStatuses, routes } from "@/constants";
import type { ReportPayload, User } from "@/types";

type ReportType =
  | "attendance"
  | "jobs"
  | "technicians"
  | "reviews"
  | "productivity";

const REPORTS: {
  key: ReportType;
  label: string;
  path: string;
  filters: ("date" | "technician" | "status" | "year")[];
}[] = [
  {
    key: "attendance",
    label: "Attendance",
    path: "/api/reports/attendance",
    filters: ["date", "technician"],
  },
  {
    key: "jobs",
    label: "Job completion",
    path: "/api/reports/jobs",
    filters: ["date", "technician", "status"],
  },
  {
    key: "technicians",
    label: "Technician performance",
    path: "/api/reports/technicians",
    filters: ["date"],
  },
  {
    key: "reviews",
    label: "Customer reviews",
    path: "/api/reports/reviews",
    filters: ["date", "technician"],
  },
  {
    key: "productivity",
    label: "Monthly productivity",
    path: "/api/reports/productivity",
    filters: ["year"],
  },
];

const fieldClass = "h-9 rounded-lg border border-slate-300 px-2 text-sm";

export function ReportsDashboard() {
  const [type, setType] = useState<ReportType>("jobs");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const config = useMemo(() => REPORTS.find((r) => r.key === type)!, [type]);

  useEffect(() => {
    api
      .get<User[]>(routes.api.technicians)
      .then(setTechnicians)
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (config.filters.includes("date")) {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (config.filters.includes("technician") && technicianId)
      params.set("technicianId", technicianId);
    if (config.filters.includes("status") && status)
      params.set("status", status);
    if (config.filters.includes("year")) params.set("year", String(year));

    api
      .get<ReportPayload>(`${config.path}?${params.toString()}`)
      .then(setPayload)
      .catch(() => setPayload(null))
      .finally(() => setLoading(false));
  }, [config, from, to, technicianId, status, year]);

  useEffect(() => {
    load();
  }, [load]);

  const years = [0, 1, 2].map((n) => new Date().getFullYear() - n);

  return (
    <div className="space-y-4">
      {/* Report type tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setType(r.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              type === r.key
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        {config.filters.includes("date") && (
          <>
            <label className="text-sm text-slate-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={fieldClass}
            />
            <label className="text-sm text-slate-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={fieldClass}
            />
          </>
        )}
        {config.filters.includes("technician") && (
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
        )}
        {config.filters.includes("status") && (
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
        )}
        {config.filters.includes("year") && (
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={fieldClass}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto">
          {payload && <ExportButtons payload={payload} />}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Generating report…</p>
      ) : !payload ? (
        <p className="text-sm text-red-600">Could not load report.</p>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {payload.summary.map((s) => (
              <Card key={s.label}>
                <CardTitle>{s.label}</CardTitle>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {s.value}
                </p>
              </Card>
            ))}
          </div>

          {/* Chart */}
          {payload.chart && (
            <Card>
              <CardTitle>{payload.title}</CardTitle>
              <div className="mt-2">
                <ReportChart chart={payload.chart} />
              </div>
            </Card>
          )}

          {/* Table */}
          <Card className="overflow-x-auto">
            <CardTitle>
              {payload.rows.length} row{payload.rows.length === 1 ? "" : "s"}
            </CardTitle>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  {payload.columns.map((c) => (
                    <th key={c.key} className="px-2 py-2">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payload.rows.map((row, i) => (
                  <tr key={i}>
                    {payload.columns.map((c) => (
                      <td
                        key={c.key}
                        className="px-2 py-2 capitalize text-slate-700"
                      >
                        {row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
                {payload.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={payload.columns.length}
                      className="px-2 py-6 text-center text-slate-400"
                    >
                      No data for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

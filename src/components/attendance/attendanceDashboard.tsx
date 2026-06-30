"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { api } from "@/hooks/useApi";
import type { DailyAttendanceReport, RangeAttendanceReport } from "@/types";

type Period = "daily" | "weekly" | "monthly";
type Report = DailyAttendanceReport | RangeAttendanceReport;

function isDaily(report: Report): report is DailyAttendanceReport {
  return "date" in report;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function time(iso?: string): string {
  return iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

const statusStyle: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-700",
  halfDay: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
};

const periods: Period[] = ["daily", "weekly", "monthly"];

export function AttendanceDashboard() {
  const [period, setPeriod] = useState<Period>("daily");
  const [date, setDate] = useState<string>(todayKey());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<Report>(`/api/attendance/report?period=${period}&date=${date}`)
      .then((r) => active && setReport(r))
      .catch(
        (e) => active && setError(e instanceof Error ? e.message : "Failed"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [period, date]);

  const cards = useMemo(() => {
    const c = report?.counts;
    return [
      { label: "Present", value: c?.present ?? 0, tone: "text-green-700" },
      { label: "Late", value: c?.late ?? 0, tone: "text-amber-700" },
      { label: "Half day", value: c?.halfDay ?? 0, tone: "text-orange-700" },
      { label: "Absent", value: c?.absent ?? 0, tone: "text-red-700" },
    ];
  }, [report]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                period === p
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 px-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardTitle>{c.label}</CardTitle>
            <p className={`mt-2 text-3xl font-bold ${c.tone}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>
          {report && !isDaily(report)
            ? `Summary · ${report.from} → ${report.to}`
            : `Daily roster · ${date}`}
        </CardTitle>

        {loading ? (
          <p className="mt-3 text-sm text-slate-400">Loading…</p>
        ) : error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : !report ? null : isDaily(report) ? (
          <DailyTable report={report} />
        ) : (
          <RangeTable report={report} />
        )}
      </Card>
    </div>
  );
}

function DailyTable({ report }: { report: DailyAttendanceReport }) {
  if (report.rows.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">No technicians found.</p>;
  }
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead className="text-xs uppercase text-slate-400">
        <tr>
          <th className="py-2">Technician</th>
          <th className="py-2">Status</th>
          <th className="py-2">Check-in</th>
          <th className="py-2">Check-out</th>
          <th className="py-2">Hours</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {report.rows.map((r) => (
          <tr key={r.userId}>
            <td className="py-2 font-medium text-slate-800">{r.name}</td>
            <td className="py-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  statusStyle[r.status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {r.status}
              </span>
            </td>
            <td className="py-2 text-slate-600">{time(r.checkInTime)}</td>
            <td className="py-2 text-slate-600">{time(r.checkOutTime)}</td>
            <td className="py-2 text-slate-600">{r.workingHours ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RangeTable({ report }: { report: RangeAttendanceReport }) {
  if (report.rows.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">No technicians found.</p>;
  }
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead className="text-xs uppercase text-slate-400">
        <tr>
          <th className="py-2">Technician</th>
          <th className="py-2">Present</th>
          <th className="py-2">Late</th>
          <th className="py-2">Half</th>
          <th className="py-2">Absent</th>
          <th className="py-2">Hours</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {report.rows.map((r) => (
          <tr key={r.userId}>
            <td className="py-2 font-medium text-slate-800">{r.name}</td>
            <td className="py-2 text-slate-600">{r.presentDays}</td>
            <td className="py-2 text-slate-600">{r.lateDays}</td>
            <td className="py-2 text-slate-600">{r.halfDays}</td>
            <td className="py-2 text-slate-600">{r.absentDays}</td>
            <td className="py-2 text-slate-600">{r.totalHours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

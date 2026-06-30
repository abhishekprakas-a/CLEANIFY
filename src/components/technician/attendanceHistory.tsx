"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { api } from "@/hooks/useApi";
import type { Attendance } from "@/types";

const statusStyle: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-700",
  halfDay: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
};

function time(iso?: string): string {
  return iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

export function AttendanceHistory() {
  const [rows, setRows] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Attendance[]>("/api/attendance/history")
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardTitle>Recent attendance</CardTitle>
      {loading ? (
        <p className="mt-3 text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No records yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-800">{r.date}</p>
                <p className="text-xs text-slate-500">
                  {time(r.checkInTime)} – {time(r.checkOutTime)}
                  {r.workingHours != null && ` · ${r.workingHours}h`}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  statusStyle[r.status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

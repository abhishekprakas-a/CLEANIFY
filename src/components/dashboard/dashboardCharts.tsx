"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const statusShort: Record<string, string> = {
  pending: "Pending",
  scheduled: "Sched",
  assigned: "Assign",
  reachedSite: "OnSite",
  beforePhotoPendingApproval: "Before✓",
  cleaningInProgress: "Cleaning",
  afterPhotoPendingApproval: "After✓",
  completed: "Done",
  cancelled: "Cancel",
};

const statusColor: Record<string, string> = {
  pending: "#94a3b8",
  scheduled: "#3b82f6",
  assigned: "#6366f1",
  reachedSite: "#f59e0b",
  beforePhotoPendingApproval: "#a855f7",
  cleaningInProgress: "#06b6d4",
  afterPhotoPendingApproval: "#a855f7",
  completed: "#22c55e",
  cancelled: "#cbd5e1",
};

export function JobsTrendChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={rows}
        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
        <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#0084cd"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function JobsByStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const rows = data.map((d) => ({
    ...d,
    label: statusShort[d.status] ?? d.status,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          fontSize={10}
          stroke="#94a3b8"
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {rows.map((r) => (
            <Cell key={r.status} fill={statusColor[r.status] ?? "#0084cd"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RatingChart({
  data,
}: {
  data: { rating: number; count: number }[];
}) {
  const rows = data.map((d) => ({ ...d, label: `${d.rating}★` }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
        <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
        <Tooltip />
        <Bar dataKey="count" fill="#fbbf24" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

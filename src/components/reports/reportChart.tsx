"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportChart as ReportChartData } from "@/types";

export function ReportChart({ chart }: { chart: ReportChartData }) {
  const margin = { top: 8, right: 8, bottom: 0, left: -20 };
  return (
    <ResponsiveContainer width="100%" height={240}>
      {chart.type === "line" ? (
        <LineChart data={chart.data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
          <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            name={chart.dataLabel}
            stroke="#0084cd"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      ) : (
        <BarChart data={chart.data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" fontSize={10} stroke="#94a3b8" />
          <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
          <Tooltip />
          <Bar
            dataKey="value"
            name={chart.dataLabel}
            fill="#0084cd"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

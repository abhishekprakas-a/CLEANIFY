"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/ui/starRating";
import {
  JobsByStatusChart,
  JobsTrendChart,
  RatingChart,
} from "@/components/dashboard/dashboardCharts";
import type { AdminDashboard } from "@/types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function AdminDashboardView({ data }: { data: AdminDashboard }) {
  const { kpis, attendanceSummary: att } = data;

  const cards = [
    { label: "Today's jobs", value: kpis.todaysJobs, tone: "text-brand-700" },
    { label: "Pending jobs", value: kpis.pendingJobs, tone: "text-amber-700" },
    { label: "Completed", value: kpis.completedJobs, tone: "text-green-700" },
    {
      label: "Pending approvals",
      value: kpis.pendingApprovals,
      tone: "text-purple-700",
    },
    { label: "Customers", value: kpis.totalCustomers, tone: "text-slate-800" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardTitle>{c.label}</CardTitle>
            <p className={`mt-1 text-3xl font-bold ${c.tone}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Attendance + rating */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Attendance today · {att.date}</CardTitle>
          <div className="mt-3 grid grid-cols-4 gap-3 text-center text-sm">
            {[
              { k: "Present", v: att.present, c: "text-green-700" },
              { k: "Late", v: att.late, c: "text-amber-700" },
              { k: "Half day", v: att.halfDay, c: "text-orange-700" },
              { k: "Absent", v: att.absent, c: "text-red-700" },
            ].map((x) => (
              <div key={x.k} className="rounded-lg bg-slate-50 p-3">
                <p className={`text-2xl font-bold ${x.c}`}>{x.v}</p>
                <p className="text-slate-500">{x.k}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Avg. rating</CardTitle>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-4xl font-bold text-slate-900">
              {kpis.averageRating.toFixed(1)}
            </span>
            <StarRating value={kpis.averageRating} readOnly />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Jobs created (last 7 days)</CardTitle>
          <div className="mt-2">
            <JobsTrendChart data={data.jobsTrend} />
          </div>
        </Card>
        <Card>
          <CardTitle>Jobs by status</CardTitle>
          <div className="mt-2">
            <JobsByStatusChart data={data.jobsByStatus} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Rating distribution</CardTitle>
          <div className="mt-2">
            <RatingChart data={data.ratingDistribution} />
          </div>
        </Card>

        {/* Recent reviews table */}
        <Card className="lg:col-span-2">
          <CardTitle>Recent customer reviews</CardTitle>
          {data.recentReviews.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No reviews yet.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Rating</th>
                  <th className="py-2">Technician</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentReviews.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium text-slate-800">
                      {r.customerName}
                    </td>
                    <td className="py-2">
                      <StarRating value={r.starRating} readOnly size="sm" />
                    </td>
                    <td className="py-2 text-slate-600">
                      {r.technicianName ?? "—"}
                    </td>
                    <td className="py-2 text-slate-500">
                      {fmtDate(r.reviewDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

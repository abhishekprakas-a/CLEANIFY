"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttendanceCard } from "@/components/technician/attendanceCard";
import { JobList } from "@/components/technician/jobList";
import { InstallButton } from "@/components/pwa/installButton";
import { useAuth } from "@/hooks/useAuth";
import { useAssignedJobs } from "@/hooks/useAssignedJobs";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { TechnicianDashboardData } from "@/types";

const statusShort: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  assigned: "Assigned",
  reachedSite: "On site",
  beforePhotoPendingApproval: "Before approval",
  cleaningInProgress: "Cleaning",
  afterPhotoPendingApproval: "After approval",
};

export function TechnicianDashboard() {
  const { user } = useAuth();
  const { jobs, loading, fromCache } = useAssignedJobs();
  const [summary, setSummary] = useState<TechnicianDashboardData | null>(null);

  useEffect(() => {
    api
      .get<TechnicianDashboardData>("/api/dashboard/technician")
      .then(setSummary)
      .catch(() => {});
  }, []);

  const counts = summary?.counts ?? {
    assignedActive: 0,
    today: 0,
    completed: 0,
  };
  const progressMax = Math.max(
    1,
    ...(summary?.progress ?? []).map((p) => p.count),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Hi{user ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-500">Here&apos;s your day.</p>
        </div>
        <InstallButton />
      </div>

      <AttendanceCard />

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardTitle>Active</CardTitle>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {counts.assignedActive}
          </p>
        </Card>
        <Card>
          <CardTitle>Today</CardTitle>
          <p className="mt-1 text-2xl font-bold text-brand-700">
            {counts.today}
          </p>
        </Card>
        <Card>
          <CardTitle>Completed</CardTitle>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {counts.completed}
          </p>
        </Card>
      </div>

      {/* Today's schedule */}
      <Card>
        <CardTitle>Today&apos;s schedule</CardTitle>
        {!summary || summary.todaysSchedule.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            No jobs scheduled for today.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {summary.todaysSchedule.map((j) => (
              <li key={j.id}>
                <Link
                  href={`${routes.technician.jobs}/${j.id}`}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {j.scheduledTime ? `${j.scheduledTime} · ` : ""}
                      {j.customer?.customerName ?? j.jobCode}
                    </p>
                    <p className="text-xs text-slate-400">{j.jobCode}</p>
                  </div>
                  <Badge status={j.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Job progress summary */}
      {summary && summary.progress.length > 0 && (
        <Card>
          <CardTitle>Job progress</CardTitle>
          <div className="mt-2 space-y-1.5">
            {summary.progress.map((p) => (
              <div key={p.status} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 text-xs text-slate-500">
                  {statusShort[p.status] ?? p.status}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${(p.count / progressMax) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-slate-500">{p.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Full assigned-jobs list (offline cached) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">My jobs</h2>
          {fromCache && (
            <span className="text-xs text-amber-600">offline · cached</span>
          )}
        </div>
        {loading && jobs.length === 0 ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <JobList jobs={jobs} />
        )}
      </div>
    </div>
  );
}

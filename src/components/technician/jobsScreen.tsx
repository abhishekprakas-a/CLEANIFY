"use client";

import { JobList } from "@/components/technician/jobList";
import { useAssignedJobs } from "@/hooks/useAssignedJobs";

export function JobsScreen() {
  const { jobs, loading, fromCache } = useAssignedJobs();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">My jobs</h1>
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
  );
}

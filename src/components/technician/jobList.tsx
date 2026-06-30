"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/constants";
import type { Job } from "@/types";

function fmt(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

export function JobList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
        No jobs assigned right now.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link
            href={`${routes.technician.jobs}/${job.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">{job.jobCode}</span>
              <Badge status={job.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {fmt(job.scheduledDate)}
              {job.scheduledTime ? ` · ${job.scheduledTime}` : ""}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

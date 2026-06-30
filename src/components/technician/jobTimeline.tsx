"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { api } from "@/hooks/useApi";
import type { JobTimelineEvent } from "@/types";

const statusLabel: Record<string, string> = {
  pending: "Created",
  scheduled: "Scheduled",
  assigned: "Assigned",
  reachedSite: "Reached site",
  beforePhotoPendingApproval: "Before photos submitted",
  cleaningInProgress: "Cleaning started",
  afterPhotoPendingApproval: "After photos submitted",
  completed: "Completed",
  cancelled: "Cancelled",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JobTimeline({
  jobId,
  version,
}: {
  jobId: string;
  version?: number;
}) {
  const [events, setEvents] = useState<JobTimelineEvent[]>([]);

  useEffect(() => {
    api
      .get<JobTimelineEvent[]>(`/api/jobs/${jobId}/timeline`)
      .then(setEvents)
      .catch(() => {});
  }, [jobId, version]);

  if (events.length === 0) return null;

  return (
    <Card>
      <CardTitle>Activity timeline</CardTitle>
      <ol className="mt-3 space-y-3">
        {events.map((e, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
              {i < events.length - 1 && (
                <span className="w-px flex-1 bg-slate-200" />
              )}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium text-slate-800">
                {statusLabel[e.status] ?? e.status}
              </p>
              <p className="text-xs text-slate-400">
                {fmt(e.at)} · {e.by.name}
              </p>
              {e.note && (
                <p className="mt-0.5 text-xs text-slate-500">{e.note}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

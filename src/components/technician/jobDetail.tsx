"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUploader } from "@/components/technician/photoUploader";
import { JobTimeline } from "@/components/technician/jobTimeline";
import { api } from "@/hooks/useApi";
import {
  jobStatus,
  routes,
  serviceConfig,
  type ServiceType,
} from "@/constants";
import type { Job } from "@/types";

type PopulatedCustomer = {
  customerName?: string;
  mobileNumber?: string;
  address?: string;
  googleMapLocation?: string;
};
type DetailJob = Omit<Job, "customer"> & {
  customer?: string | PopulatedCustomer;
};

function customerOf(job: DetailJob): PopulatedCustomer {
  return typeof job.customer === "object" ? job.customer : {};
}

function mapsUrl(c: PopulatedCustomer): string | null {
  if (c.googleMapLocation) {
    // Accept links pasted without a scheme (e.g. from WhatsApp) — BG-05.
    return /^https?:\/\//i.test(c.googleMapLocation)
      ? c.googleMapLocation
      : `https://${c.googleMapLocation}`;
  }
  if (c.address)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
  return null;
}

export function JobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<DetailJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beforeCount, setBeforeCount] = useState(0);
  const [afterCount, setAfterCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.get<DetailJob>(`/api/jobs/${jobId}`);
      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(to: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/jobs/${jobId}/transition`, { to, ...extra });
      await load();
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update job");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!job)
    return <p className="text-sm text-red-600">{error ?? "Job not found"}</p>;

  const customer = customerOf(job);
  const maps = mapsUrl(customer);
  const status = job.status;
  const itemNoun = (
    serviceConfig[(job.serviceType as ServiceType) ?? "waterTank"] ??
    serviceConfig.waterTank
  ).itemLabel.toLowerCase();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={routes.technician.jobs}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← My jobs
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">{job.jobCode}</h1>
          <Badge status={status} />
        </div>
        {job.workName && (
          <p className="mt-0.5 text-sm font-medium text-slate-600">
            {job.workName}
          </p>
        )}
      </div>

      <Card>
        <CardTitle>Customer</CardTitle>
        <p className="mt-2 font-medium text-slate-800">
          {customer.customerName ?? "—"}
        </p>
        {customer.mobileNumber && (
          <a
            href={`tel:${customer.mobileNumber}`}
            className="text-sm text-brand-600"
          >
            {customer.mobileNumber}
          </a>
        )}
        {customer.address && (
          <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
            {customer.address}
          </p>
        )}
        {maps && (
          <a href={maps} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" className="mt-3">
              📍 Open in Maps
            </Button>
          </a>
        )}
      </Card>

      {(job.tanks ?? []).length > 0 &&
        (() => {
          const cfg =
            serviceConfig[(job.serviceType as ServiceType) ?? "waterTank"] ??
            serviceConfig.waterTank;
          return (
            <Card>
              <CardTitle>
                {cfg.itemLabel}s to clean ({job.tanks.length})
              </CardTitle>
              <p className="-mt-1 mb-1 text-xs text-slate-400">{cfg.label}</p>
              <ul className="mt-2 space-y-2">
                {job.tanks.map((t, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
                  >
                    <span className="font-medium capitalize text-slate-800">
                      {t.name || `${t.tankType} ${cfg.itemLabel.toLowerCase()}`}
                    </span>
                    <span className="text-slate-500">
                      {" · "}
                      {t.tankType}
                      {t.capacityLitres != null && cfg.measureUnit
                        ? ` · ${t.capacityLitres} ${cfg.measureUnit}`
                        : ""}
                      {t.quantity && t.quantity > 1 ? ` · ×${t.quantity}` : ""}
                    </span>
                    {t.risk != null && (
                      <span
                        className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          t.risk >= 7
                            ? "bg-red-100 text-red-700"
                            : t.risk >= 4
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        Risk {t.risk}/10
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })()}

      {/* Step-driven workflow — only the valid next action is shown. */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {status === jobStatus.assigned && (
        <Card>
          <CardTitle>Step 1 — Reach the site</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Tap below once you arrive. You must be checked in.
          </p>
          <Button
            className="mt-3 w-full"
            disabled={busy}
            onClick={() => transition(jobStatus.reachedSite)}
          >
            I&apos;ve reached the site
          </Button>
        </Card>
      )}

      {(status === jobStatus.reachedSite ||
        status === jobStatus.beforePhotoPendingApproval) && (
        <Card>
          <CardTitle>Step 2 — Before-cleaning photos</CardTitle>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            Capture the {itemNoun} before cleaning, then start the work.
          </p>
          <PhotoUploader
            jobId={jobId}
            photoType="before"
            onCountChange={setBeforeCount}
          />
          <Button
            className="mt-3 w-full"
            disabled={busy || beforeCount < 1}
            onClick={() => transition(jobStatus.cleaningInProgress)}
          >
            Start cleaning
          </Button>
        </Card>
      )}

      {(status === jobStatus.cleaningInProgress ||
        status === jobStatus.afterPhotoPendingApproval) && (
        <Card>
          <CardTitle>Step 3 — After-cleaning photos &amp; finish</CardTitle>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            Cleaning in progress. Upload after-cleaning photos, then complete the
            job.
          </p>
          <PhotoUploader
            jobId={jobId}
            photoType="after"
            onCountChange={setAfterCount}
          />
          <Textarea
            label="Completion notes (optional)"
            className="mt-3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            className="mt-3 w-full"
            disabled={busy || afterCount < 1}
            onClick={() =>
              transition(jobStatus.completed, {
                completionNotes: notes || undefined,
              })
            }
          >
            Complete job
          </Button>
        </Card>
      )}

      {status === jobStatus.completed && (
        <Card>
          <p className="text-center text-sm font-medium text-green-700">
            ✓ Job completed. Great work!
          </p>
        </Card>
      )}

      {status === jobStatus.cancelled && (
        <Card>
          <p className="text-center text-sm text-slate-500">
            This job was cancelled.
          </p>
        </Card>
      )}

      <JobTimeline jobId={jobId} version={version} />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PhotoUploader } from "@/components/technician/photoUploader";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { routes, submissionType } from "@/constants";
import type { DayCheckState, Photo, WorkDayStatus } from "@/types";

/**
 * Drives the technician's day-level checks at base: machinery + uniform photos
 * at the start of the day (gates all sites until an admin approves) and again on
 * return to base at the end of the day.
 */
export function WorkDayPanel({
  onStatus,
}: {
  onStatus?: (s: WorkDayStatus) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<WorkDayStatus | null>(null);
  const [machinery, setMachinery] = useState<Photo[]>([]);
  const [uniform, setUniform] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<WorkDayStatus>(routes.api.workdayToday)
      .then((s) => {
        setStatus(s);
        onStatus?.(s);
      })
      .catch(() => {});
  }, [onStatus]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(type: string) {
    if (machinery.length < 1 || uniform.length < 1) {
      toast.error("Add a machinery photo and a uniform / mask photo");
      return;
    }
    setBusy(true);
    try {
      await api.post(routes.api.workdayCheck, {
        type,
        photoIds: [...machinery.map((p) => p.id), ...uniform.map((p) => p.id)],
      });
      setMachinery([]);
      setUniform([]);
      toast.success("Submitted for approval");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  // NOTE: these are plain functions returning JSX and are *called* ({renderCheck()}),
  // never used as <Component/> — defining components inline would give them a new
  // type each render and remount the PhotoUploaders (losing their previews).
  function renderCheck(
    state: DayCheckState,
    type: string,
    submitLabel: string,
    pendingText: string,
    approvedText: string,
  ) {
    if (state.status === "approved") {
      return (
        <p className="text-sm font-medium text-green-700">✓ {approvedText}</p>
      );
    }
    if (state.status === "pending") {
      return (
        <p className="text-sm font-medium text-amber-700">⏳ {pendingText}</p>
      );
    }
    return (
      <div>
        {state.status === "declined" && state.declineReason && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            Declined: {state.declineReason} — please retake and resubmit.
          </p>
        )}
        <p className="mb-1 text-xs font-medium text-slate-600">
          Machinery {machinery.length > 0 ? "✓" : "(required)"}
        </p>
        <PhotoUploader
          photoType="machinery"
          label="machinery"
          onPhotosChange={setMachinery}
        />
        <p className="mb-1 mt-3 text-xs font-medium text-slate-600">
          Uniform / mask {uniform.length > 0 ? "✓" : "(required)"}
        </p>
        <PhotoUploader
          photoType="uniformMask"
          label="uniform / mask"
          onPhotosChange={setUniform}
        />
        <Button
          className="mt-4 w-full"
          disabled={busy}
          onClick={() => submit(type)}
        >
          {submitLabel}
        </Button>
      </div>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardTitle>Start-of-day check</CardTitle>
        <p className="mt-1 text-sm text-slate-400">Loading…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Start-of-day check (at base)</CardTitle>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          Photograph the machinery (in order) and yourself in uniform/mask before
          heading out. Your sites unlock once an admin approves this.
        </p>
        {renderCheck(
          status.start,
          submissionType.startOfDay,
          "Submit start-of-day check",
          "Submitted — waiting for approval before you can start sites.",
          "Approved — your sites are unlocked.",
        )}
      </Card>

      {status.sitesUnlocked && (
        <Card>
          <CardTitle>End-of-day check (return to base)</CardTitle>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            After finishing all your sites and returning to base, photograph the
            machinery and uniform again to close out the day.
          </p>
          {renderCheck(
            status.end,
            submissionType.endOfDay,
            "Submit end-of-day check",
            "Submitted — waiting for approval.",
            "Day closed. Great work!",
          )}
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { lateReasonPresets, routes } from "@/constants";

/**
 * "Running late?" — lets a technician/supervisor raise a late request with a
 * reason that reaches the admin for review. Optionally tied to a job (site).
 */
export function LateRequestCard({ jobId }: { jobId?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (reason.trim().length < 3) {
      toast.error("Add a short reason");
      return;
    }
    setBusy(true);
    try {
      await api.post(routes.api.lateRequests, {
        reason: reason.trim(),
        jobId,
      });
      toast.success("Late request sent to admin");
      setReason("");
      setOpen(false);
      setSent(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send late request",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Running late?</CardTitle>
        {!open && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Raise late request
          </Button>
        )}
      </div>

      {!open && (
        <p className="mt-1 text-sm text-slate-500">
          {sent
            ? "Request sent — the admin has been notified. You can raise another if needed."
            : "If this work is running behind, let the admin know with a reason."}
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {lateReasonPresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
              >
                {p}
              </button>
            ))}
          </div>
          <Textarea
            label="Reason (required)"
            placeholder="Why is the work running late?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button disabled={busy || reason.trim().length < 3} onClick={submit}>
              Send to admin
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

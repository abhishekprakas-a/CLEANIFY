"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import {
  declineReasonPresets,
  routes,
  submissionType,
} from "@/constants";
import type { Submission } from "@/types";

const CATEGORY_LABEL: Record<string, string> = {
  machinery: "Machinery",
  uniformMask: "Uniform / mask",
  completion: "Completion",
  before: "Before",
  after: "After",
};

function typeLabel(t: string): string {
  return t === submissionType.preWork ? "Pre-work check" : "Completion";
}

export function ApprovalsList({
  status,
}: {
  status: "pending" | "approved" | "declined";
}) {
  const toast = useToast();
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Submission[]>(`${routes.api.submissions}?status=${status}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.post(`${routes.api.submissions}/${id}/approve`, {});
      toast.success("Approved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string, reason: string) {
    if (!reason.trim()) {
      toast.error("Enter a decline reason");
      return;
    }
    setBusyId(id);
    try {
      await api.post(`${routes.api.submissions}/${id}/decline`, { reason });
      toast.success("Declined — the worker has been notified");
      setDecliningId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not decline");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        No {status} submissions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((s) => (
        <div
          key={s.id}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">
                  {s.job?.jobCode ?? "—"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {typeLabel(s.type)}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {s.job?.customerName ?? ""}
                {s.submittedBy ? ` · by ${s.submittedBy.name}` : ""}
                {" · "}
                {new Date(s.submittedAt).toLocaleString()}
              </p>
            </div>
            {s.status !== "pending" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  s.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {s.status}
                {s.reviewedBy ? ` · ${s.reviewedBy.name}` : ""}
              </span>
            )}
          </div>

          {/* Photos */}
          {s.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {s.photos.map((p) => (
                <a
                  key={p.id}
                  href={p.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-lg border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photoUrl}
                    alt={CATEGORY_LABEL[p.photoType] ?? p.photoType}
                    className="h-24 w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 px-1 py-0.5 text-[10px] text-white">
                    {CATEGORY_LABEL[p.photoType] ?? p.photoType}
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* Details */}
          {s.details && Object.keys(s.details).length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
              {Object.entries(s.details).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="capitalize text-slate-400">{k}</dt>
                  <dd className="text-right text-slate-600">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}

          {s.declineReason && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              Declined: {s.declineReason}
            </p>
          )}

          {/* Actions (pending only) */}
          {s.status === "pending" && (
            <div className="border-t border-slate-100 pt-3">
              {decliningId === s.id ? (
                <DeclinePanel
                  busy={busyId === s.id}
                  onCancel={() => setDecliningId(null)}
                  onSubmit={(reason) => decline(s.id, reason)}
                />
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approve(s.id)}
                    disabled={busyId === s.id}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDecliningId(s.id)}
                    disabled={busyId === s.id}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DeclinePanel({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {declineReasonPresets.map((p) => (
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
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for declining (the worker will see this)…"
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="danger"
          onClick={() => onSubmit(reason)}
          disabled={busy}
        >
          Confirm decline
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

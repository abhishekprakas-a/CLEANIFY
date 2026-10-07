"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/cn";
import { routes } from "@/constants";
import type { LateRequest } from "@/types";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "all", label: "All" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function LateRequestsList() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("pending");
  const [items, setItems] = useState<LateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notingId, setNotingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const refresh = useCallback(() => {
    api
      .get<LateRequest[]>(`${routes.api.lateRequests}?status=${tab}`)
      .then(setItems)
      .catch(() => {});
  }, [tab]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<LateRequest[]>(`${routes.api.lateRequests}?status=${tab}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab]);

  // Initial load + light polling (paused when hidden, refreshes on focus) so new
  // requests appear and acknowledged ones drop off without a manual refresh.
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load, refresh]);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      await api.post(`${routes.api.lateRequests}/${id}/review`, {
        note: note.trim() || undefined,
      });
      toast.success("Acknowledged — the technician has been notified");
      setNotingId(null);
      setNote("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not acknowledge");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
          No {tab === "all" ? "" : tab} late requests.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div
              key={r.id}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {r.requestedBy?.name ?? "Technician"}
                    </span>
                    {r.job?.jobCode && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {r.job.jobCode}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {r.job ? "Site" : "General"} · {timeAgo(r.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    r.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700",
                  )}
                >
                  {r.status}
                  {r.reviewedBy ? ` · ${r.reviewedBy.name}` : ""}
                </span>
              </div>

              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {r.reason}
              </p>

              {r.adminNote && (
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                  Your note: {r.adminNote}
                </p>
              )}

              {r.status === "pending" && (
                <div className="border-t border-slate-100 pt-3">
                  {notingId === r.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional note back to the technician…"
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => acknowledge(r.id)}
                          disabled={busyId === r.id}
                        >
                          Confirm acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNotingId(null);
                            setNote("");
                          }}
                          disabled={busyId === r.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setNotingId(r.id);
                        setNote("");
                      }}
                      disabled={busyId === r.id}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

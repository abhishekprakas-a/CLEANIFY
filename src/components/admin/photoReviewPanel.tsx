"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/hooks/useApi";
import type { PendingReviewItem, Photo } from "@/types";

const approvalStyle: Record<string, string> = {
  pending: "bg-slate-200 text-slate-600",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function PhotoReviewPanel() {
  const [items, setItems] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get<PendingReviewItem[]>("/api/photos/pending"));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(photo: Photo) {
    setBusy(photo.id);
    try {
      await api.post(`/api/photos/${photo.id}/approve`, undefined);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(photo: Photo) {
    const reason = prompt(
      "What needs improvement? (sent back to the technician)",
    );
    if (!reason) return;
    setBusy(photo.id);
    try {
      await api.post(`/api/photos/${photo.id}/reject`, {
        rejectionReason: reason,
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (items.length === 0)
    return (
      <Card>
        <p className="text-center text-sm text-slate-400">
          Nothing awaiting photo approval. 🎉
        </p>
      </Card>
    );

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.job.id}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {item.job.jobCode} · {item.job.customerName}
              </CardTitle>
              <p className="mt-0.5 text-sm capitalize text-slate-500">
                {item.gate} cleaning photos
              </p>
            </div>
            <Badge status={item.job.status} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {item.photos.map((photo) => (
              <div key={photo.id} className="space-y-2">
                <a
                  href={photo.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photoUrl}
                    alt={`${item.gate} photo`}
                    className="h-32 w-full rounded-lg object-cover"
                  />
                </a>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                      approvalStyle[photo.approvalStatus] ?? "bg-slate-200"
                    }`}
                  >
                    {photo.approvalStatus}
                  </span>
                </div>
                {photo.approvalStatus === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy === photo.id}
                      onClick={() => approve(photo)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy === photo.id}
                      onClick={() => reject(photo)}
                    >
                      Need improvement
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Approving every photo advances the job; marking one as “Need
            improvement” sends it back to the technician.
          </p>
        </Card>
      ))}
    </div>
  );
}

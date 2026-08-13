"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/hooks/useApi";
import type { JobPhotoGroup, Photo } from "@/types";

function PhotoStrip({ label, photos }: { label: string; photos: Photo[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label} ({photos.length})
      </p>
      {photos.length === 0 ? (
        <p className="text-xs text-slate-400">None</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <a
              key={p.id}
              href={p.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photoUrl}
                alt={`${label} photo`}
                className="h-24 w-full rounded-lg object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function JobPhotoGallery() {
  const [items, setItems] = useState<JobPhotoGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get<JobPhotoGroup[]>("/api/photos/gallery"));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (items.length === 0)
    return (
      <Card>
        <p className="text-center text-sm text-slate-400">
          No job photos yet.
        </p>
      </Card>
    );

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.job.id}>
          <div className="flex items-center justify-between">
            <CardTitle>
              {item.job.jobCode} · {item.job.customerName}
            </CardTitle>
            <Badge status={item.job.status} />
          </div>
          <div className="mt-3 space-y-3">
            <PhotoStrip label="Before" photos={item.before} />
            <PhotoStrip label="After" photos={item.after} />
          </div>
        </Card>
      ))}
    </div>
  );
}

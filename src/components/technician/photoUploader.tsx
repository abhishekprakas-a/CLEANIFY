"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/hooks/useApi";
import { compressImage } from "@/lib/image/compress";
import { putWithProgress, withRetry } from "@/lib/image/upload";
import type { GeoPoint, Photo } from "@/types";

interface PresignResult {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
}

type ItemStatus = "compressing" | "uploading" | "done" | "error";
interface UploadItem {
  key: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  progress: number;
  error?: string;
}

function getLocation(): Promise<GeoPoint | undefined> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { timeout: 5000 },
    );
  });
}

const approvalStyle: Record<string, string> = {
  pending: "bg-slate-200 text-slate-600",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function PhotoUploader({
  jobId,
  photoType,
  disabled,
  onCountChange,
}: {
  jobId: string;
  photoType: "before" | "after";
  disabled?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [serverPhotos, setServerPhotos] = useState<Photo[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);

  const reload = useCallback(async () => {
    try {
      const all = await api.get<Photo[]>(`/api/photos?job=${jobId}`);
      const mine = all.filter((p) => p.photoType === photoType);
      setServerPhotos(mine);
      onCountChange?.(mine.length);
    } catch {
      /* offline / none yet */
    }
  }, [jobId, photoType, onCountChange]);

  useEffect(() => {
    reload();
  }, [reload]);

  const patch = useCallback((key: string, change: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...change } : it)),
    );
  }, []);

  const process = useCallback(
    async (item: UploadItem) => {
      try {
        patch(item.key, { status: "compressing", error: undefined });
        const compressed = await compressImage(item.file);

        const presign = await api.post<PresignResult>("/api/photos/presign", {
          jobId,
          photoType,
          contentType: compressed.contentType,
        });

        patch(item.key, { status: "uploading", progress: 0 });
        await withRetry(() =>
          putWithProgress(
            presign.uploadUrl,
            compressed.blob,
            compressed.contentType,
            (p) => patch(item.key, { progress: p }),
          ),
        );

        const geo = await getLocation();
        await api.post("/api/photos/confirm", {
          jobId,
          photoType,
          s3Key: presign.s3Key,
          photoUrl: presign.publicUrl,
          contentType: compressed.contentType,
          sizeBytes: compressed.blob.size,
          width: compressed.width,
          height: compressed.height,
          originalName: item.file.name,
          geo,
        });

        patch(item.key, { status: "done", progress: 100 });
        URL.revokeObjectURL(item.previewUrl);
        await reload();
        // Drop completed items from the queue after a moment.
        setItems((prev) => prev.filter((it) => it.key !== item.key));
      } catch (err) {
        patch(item.key, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    [jobId, photoType, patch, reload],
  );

  function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newItems: UploadItem[] = Array.from(fileList).map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "compressing" as ItemStatus,
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach(process);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      {(serverPhotos.length > 0 || items.length > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {serverPhotos.map((p) => (
            <div key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photoUrl}
                alt={`${photoType} photo`}
                className="h-20 w-full rounded-lg object-cover"
              />
              <span
                className={`absolute bottom-1 left-1 rounded px-1 text-[10px] font-medium capitalize ${
                  approvalStyle[p.approvalStatus] ?? "bg-slate-200"
                }`}
              >
                {p.approvalStatus}
              </span>
            </div>
          ))}

          {items.map((it) => (
            <div key={it.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.previewUrl}
                alt="uploading"
                className="h-20 w-full rounded-lg object-cover opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 text-[11px] font-medium text-white">
                {it.status === "compressing" && "Optimizing…"}
                {it.status === "uploading" && `${it.progress}%`}
                {it.status === "error" && (
                  <button
                    onClick={() => process(it)}
                    className="rounded bg-white px-2 py-0.5 text-red-600"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.some((it) => it.status === "error") && (
        <p className="text-xs text-red-600">
          {items.find((it) => it.status === "error")?.error} — tap a photo to
          retry.
        </p>
      )}

      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-brand-300 py-3 text-sm font-medium text-brand-700"
          >
            📷 Add {photoType} photos
          </button>
        </>
      )}
    </div>
  );
}

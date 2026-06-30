"use client";

export interface CompressResult {
  blob: Blob;
  contentType: string;
  width?: number;
  height?: number;
}

/**
 * Downscale + re-encode an image to JPEG in the browser before upload. Falls
 * back to the original file if the image can't be decoded (e.g. HEIC).
 */
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<CompressResult> {
  const maxDimension = opts.maxDimension ?? 1600;
  const quality = opts.quality ?? 0.7;

  if (!file.type.startsWith("image/")) {
    return { blob: file, contentType: file.type };
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, contentType: file.type };

  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return { blob: file, contentType: file.type };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return { blob: file, contentType: file.type };

  // Only keep the compressed version if it's actually smaller.
  if (blob.size >= file.size) {
    return { blob: file, contentType: file.type, width, height };
  }
  return { blob, contentType: "image/jpeg", width, height };
}

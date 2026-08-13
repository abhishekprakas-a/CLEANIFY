import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * Object storage for before/after job photos on AWS S3 (configured via the
 * S3_* env vars). Also works with any S3-compatible store (e.g. MinIO) by
 * setting S3_ENDPOINT; for AWS S3 leave it empty and the SDK derives the host
 * from the region.
 */
const { storage } = env;

export const storageClient = new S3Client({
  region: storage.region,
  endpoint: storage.endpoint || undefined,
  forcePathStyle: storage.forcePathStyle,
  // Bound retry latency: the server-side HEAD/DELETE calls are best-effort, so
  // don't let a persistent error retry-storm and block a request.
  maxAttempts: 2,
  credentials: {
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
  },
});

export interface PresignResult {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
}

/** The canonical public URL for a stored object, derived from its key. */
export function publicUrlForKey(s3Key: string): string {
  const base = storage.publicBaseUrl.replace(/\/$/, "");
  return `${base}/${s3Key}`;
}

/**
 * Create a short-lived presigned PUT URL the browser uses to upload directly to
 * the bucket, plus the resulting public URL (from S3_PUBLIC_BASE_URL).
 */
export async function createPresignedUpload(
  s3Key: string,
  contentType: string,
): Promise<PresignResult> {
  const command = new PutObjectCommand({
    Bucket: storage.bucket,
    Key: s3Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(storageClient, command, {
    expiresIn: storage.presignExpires,
  });

  return { uploadUrl, s3Key, publicUrl: publicUrlForKey(s3Key) };
}

/** Actual stored size of an object in bytes (via HEAD), or undefined if unknown. */
export async function getObjectSize(s3Key: string): Promise<number | undefined> {
  const res = await storageClient.send(
    new HeadObjectCommand({ Bucket: storage.bucket, Key: s3Key }),
  );
  return res.ContentLength;
}

/** Delete an object from the bucket (best-effort; used when removing a photo). */
export async function deleteObject(s3Key: string): Promise<void> {
  await storageClient.send(
    new DeleteObjectCommand({ Bucket: storage.bucket, Key: s3Key }),
  );
}

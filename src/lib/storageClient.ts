import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * Cloudflare R2 object storage. R2 implements the S3 API, so we use the AWS S3
 * SDK pointed at the R2 endpoint with region "auto". The same code also works
 * with any other S3-compatible store (AWS S3, MinIO) by changing the endpoint.
 */
const endpoint =
  env.r2Endpoint ||
  (env.r2AccountId
    ? `https://${env.r2AccountId}.r2.cloudflarestorage.com`
    : undefined);

export const storageClient = new S3Client({
  region: env.r2Region,
  endpoint,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  },
});

export interface PresignResult {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
}

/**
 * Create a short-lived presigned PUT URL the browser uses to upload directly to
 * the R2 bucket, plus the resulting public URL (r2.dev or custom domain).
 */
export async function createPresignedUpload(
  s3Key: string,
  contentType: string,
): Promise<PresignResult> {
  const command = new PutObjectCommand({
    Bucket: env.r2Bucket,
    Key: s3Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(storageClient, command, {
    expiresIn: env.r2PresignedExpiresSeconds,
  });

  const base = env.r2PublicBaseUrl.replace(/\/$/, "");
  return { uploadUrl, s3Key, publicUrl: `${base}/${s3Key}` };
}

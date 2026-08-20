import { z } from "zod";
import { allPhotoCategories } from "@/constants";
import { geoSchema } from "./customerSchema";

const contentTypeSchema = z
  .string()
  .regex(/^image\/(jpeg|png|webp|heic)$/i, "Only image uploads are allowed");

/** Step 1: ask for a presigned PUT URL (no DB row yet). */
export const presignPhotoSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  photoType: z.enum(allPhotoCategories as [string, ...string[]]),
  contentType: contentTypeSchema,
});

/**
 * Step 2: confirm a finished upload — this creates the photo record. The public
 * URL is derived server-side from `s3Key`, never taken from the client.
 */
export const confirmPhotoSchema = z.object({
  jobId: z.string().min(1),
  photoType: z.enum(allPhotoCategories as [string, ...string[]]),
  s3Key: z.string().min(1),
  contentType: contentTypeSchema,
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024, "Photo exceeds the 8 MB limit")
    .optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  originalName: z.string().optional(),
  geo: geoSchema.optional(),
});

export type PresignPhotoInput = z.infer<typeof presignPhotoSchema>;
export type ConfirmPhotoInput = z.infer<typeof confirmPhotoSchema>;

import { z } from "zod";
import { photoKind } from "@/constants";
import { geoSchema } from "./customerSchema";

const contentTypeSchema = z
  .string()
  .regex(/^image\/(jpeg|png|webp|heic)$/i, "Only image uploads are allowed");

/** Step 1: ask for a presigned PUT URL (no DB row yet). */
export const presignPhotoSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  photoType: z.enum(Object.values(photoKind) as [string, ...string[]]),
  contentType: contentTypeSchema,
});

/** Step 2: confirm a finished upload — this creates the photo record. */
export const confirmPhotoSchema = z.object({
  jobId: z.string().min(1),
  photoType: z.enum(Object.values(photoKind) as [string, ...string[]]),
  s3Key: z.string().min(1),
  photoUrl: z.string().url(),
  contentType: contentTypeSchema,
  sizeBytes: z.coerce.number().int().positive().optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  originalName: z.string().optional(),
  geo: geoSchema.optional(),
});

export const rejectPhotoSchema = z.object({
  rejectionReason: z.string().min(1, "A rejection reason is required"),
});

export type PresignPhotoInput = z.infer<typeof presignPhotoSchema>;
export type ConfirmPhotoInput = z.infer<typeof confirmPhotoSchema>;
export type RejectPhotoInput = z.infer<typeof rejectPhotoSchema>;

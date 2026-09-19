import { z } from "zod";
import { allSubmissionTypes, submissionType } from "@/constants";

/** Technician submits a pre-work / completion evidence bundle for approval. */
export const createSubmissionSchema = z.object({
  type: z.enum(allSubmissionTypes as [string, ...string[]]),
  photoIds: z.array(z.string().min(1)).min(1, "Attach at least one photo"),
  details: z.record(z.string(), z.unknown()).optional(),
});

/** Technician submits a day-level (start-of-day / at-base) check. */
export const dayCheckSubmitSchema = z.object({
  type: z.enum([submissionType.startOfDay, submissionType.endOfDay]),
  photoIds: z.array(z.string().min(1)).min(1, "Attach at least one photo"),
});

export const declineSubmissionSchema = z.object({
  reason: z.string().trim().min(1, "A decline reason is required"),
});

export const submissionQuerySchema = z.object({
  status: z.enum(["pending", "approved", "declined", "all"]).default("pending"),
  jobId: z.string().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type DayCheckSubmitInput = z.infer<typeof dayCheckSubmitSchema>;
export type DeclineSubmissionInput = z.infer<typeof declineSubmissionSchema>;
export type SubmissionQueryInput = z.infer<typeof submissionQuerySchema>;

import { z } from "zod";
import { allSatisfactionStatuses } from "@/constants";

export const createReviewSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  starRating: z.coerce.number().int().min(1).max(5),
  reviewComment: z.string().trim().optional(),
  // Optional — derived from the rating when omitted.
  satisfactionStatus: z
    .enum(allSatisfactionStatuses as [string, ...string[]])
    .optional(),
  reviewDate: z.coerce.date().optional(),
  source: z.enum(["phone", "link"]).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

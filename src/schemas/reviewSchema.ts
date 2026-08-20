import { z } from "zod";
import { allSatisfactionStatuses } from "@/constants";

/** Internal per-staff rating captured alongside the customer review (C9). */
export const staffRatingInputSchema = z.object({
  staffUserId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  remark: z.string().trim().optional(),
});

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
  /** Optional internal staff ratings; capturing the review closes the job. */
  staffRatings: z.array(staffRatingInputSchema).optional(),
});

export type StaffRatingInput = z.infer<typeof staffRatingInputSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

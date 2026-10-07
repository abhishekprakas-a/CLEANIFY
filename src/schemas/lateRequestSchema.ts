import { z } from "zod";

/** Technician/supervisor raises a "running late" request. */
export const createLateRequestSchema = z.object({
  reason: z.string().trim().min(3, "Add a short reason").max(500),
  jobId: z.string().optional(),
});

/** Admin acknowledges a late request (optional note back to the technician). */
export const reviewLateRequestSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const lateRequestQuerySchema = z.object({
  status: z.enum(["pending", "acknowledged", "all"]).default("pending"),
});

export type CreateLateRequestInput = z.infer<typeof createLateRequestSchema>;
export type ReviewLateRequestInput = z.infer<typeof reviewLateRequestSchema>;
export type LateRequestQueryInput = z.infer<typeof lateRequestQuerySchema>;

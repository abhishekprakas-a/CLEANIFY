import { ApiError } from "@/lib/apiError";
import { jobStatus, jobTransitions, type JobStatus } from "@/constants";

/** Minimal structural shape of the parts of a job doc the helper mutates. */
interface MutableJob {
  status: string;
  statusHistory: unknown[];
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Validate and apply a status transition on a job document (in memory — the
 * caller saves). Checks only the edge against `jobTransitions`; role/guards are
 * the caller's responsibility. Stamps `startedAt`/`completedAt` where relevant.
 *
 * Shared by jobService (technician execution edges), photoService (approval
 * edges) and schedulingService (scheduling edges) so the state machine has a
 * single enforcement point.
 */
export function applyJobTransition(
  job: MutableJob,
  next: JobStatus,
  byUserId: string,
  note?: string,
): void {
  const current = job.status as JobStatus;
  if (!jobTransitions[current]?.includes(next)) {
    throw ApiError.invalidTransition(
      `Cannot move a job from "${current}" to "${next}"`,
    );
  }

  job.status = next;
  job.statusHistory.push({ status: next, at: new Date(), by: byUserId, note });

  if (next === jobStatus.cleaningInProgress && !job.startedAt) {
    job.startedAt = new Date();
  }
  if (next === jobStatus.completed) {
    job.completedAt = new Date();
  }
}

import { ApiError } from "@/lib/apiError";

/**
 * In-memory fixed-window rate limiter. Sufficient for a single instance; for
 * multi-instance deployments back it with Redis (same interface).
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/**
 * Periodically drop expired buckets so the map can't grow without bound as new
 * keys (IP+email combinations) arrive — otherwise it leaks memory for the life
 * of the process. Runs at most once per interval, on demand (no timer to leak).
 */
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

function sweepExpired(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Throws 429 if the key is over the limit. */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): void {
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw ApiError.tooManyRequests(
      `Too many requests. Try again in ${result.retryAfterSeconds}s.`,
    );
  }
}

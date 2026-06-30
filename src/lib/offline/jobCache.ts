"use client";

import type { Job } from "@/types";

/** Caches the technician's assigned jobs so the dashboard works offline. */
const KEY = "wtcs.assignedJobs";

interface CachedJobs {
  jobs: Job[];
  cachedAt: number;
}

export const jobCache = {
  save(jobs: Job[]): void {
    if (typeof window === "undefined") return;
    const payload: CachedJobs = { jobs, cachedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  },

  load(): CachedJobs | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as CachedJobs) : null;
    } catch {
      return null;
    }
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
  },
};

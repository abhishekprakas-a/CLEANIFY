"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/hooks/useApi";
import { jobCache } from "@/lib/offline/jobCache";
import type { Job } from "@/types";

/**
 * Loads the technician's assigned jobs, caching them for offline use. When the
 * network fetch fails (offline), it falls back to the last cached list.
 */
export function useAssignedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await api.list<Job>("/api/jobs/assigned?limit=50");
      jobCache.save(items);
      setJobs(items);
      setFromCache(false);
    } catch {
      const cached = jobCache.load();
      setJobs(cached?.jobs ?? []);
      setFromCache(Boolean(cached));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Hydrate instantly from cache, then refresh from network.
    const cached = jobCache.load();
    if (cached) {
      setJobs(cached.jobs);
      setLoading(false);
    }
    load();
  }, [load]);

  return { jobs, loading, fromCache, refresh: load };
}

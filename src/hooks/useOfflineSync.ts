"use client";

import { useCallback, useEffect, useState } from "react";
import { outbox } from "@/lib/offline/outbox";

/**
 * Replays queued offline mutations when connectivity returns (on the `online`
 * event, on a service-worker FLUSH_OUTBOX message, and once on mount). Exposes
 * the pending count and a manual flush.
 */
export function useOfflineSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const flush = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const items = outbox.list();
    if (items.length === 0) {
      setPending(0);
      return;
    }
    setSyncing(true);
    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: item.body === undefined ? undefined : JSON.stringify(item.body),
        });
        // Drop on success or on a permanent client error (won't ever succeed).
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          outbox.remove(item.id);
        } else {
          break; // server/5xx — stop and retry later
        }
      } catch {
        break; // offline again — stop
      }
    }
    setPending(outbox.count());
    setSyncing(false);
  }, []);

  useEffect(() => {
    setPending(outbox.count());
    flush();

    const onOnline = () => flush();
    window.addEventListener("online", onOnline);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "FLUSH_OUTBOX") flush();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [flush]);

  return { pending, syncing, flush };
}

"use client";

import { outbox } from "./outbox";

export interface MutateResult {
  ok: boolean;
  queued: boolean;
  error?: string;
}

/**
 * Perform a mutation that survives being offline. When the network is available
 * it sends immediately; otherwise (or on network failure) it queues the request
 * in the outbox for `useOfflineSync` to replay on reconnect.
 */
export async function offlineMutate(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  label: string,
): Promise<MutateResult> {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  if (online) {
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.ok) return { ok: true, queued: false };
      const data = await res.json().catch(() => null);
      return { ok: false, queued: false, error: data?.error?.message };
    } catch {
      // network blip — fall through to queue
    }
  }

  outbox.enqueue({ url, method, body, label });
  registerBackgroundSync();
  return { ok: true, queued: true };
}

/** Ask the browser to fire a background sync when connectivity returns. */
function registerBackgroundSync(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  navigator.serviceWorker.ready
    .then((reg) =>
      (
        reg as unknown as {
          sync?: { register: (tag: string) => Promise<void> };
        }
      ).sync?.register("wtcs-sync-outbox"),
    )
    .catch(() => {});
}

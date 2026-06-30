"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";

/** Shows offline state and how many changes are waiting to sync. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { pending, syncing } = useOfflineSync();

  if (online && pending === 0) return null;

  return (
    <div
      className={`px-4 py-1.5 text-center text-xs font-medium ${
        online ? "bg-amber-100 text-amber-800" : "bg-slate-700 text-white"
      }`}
    >
      {!online
        ? `Offline${pending > 0 ? ` · ${pending} change${pending > 1 ? "s" : ""} queued` : ""}`
        : syncing
          ? "Syncing…"
          : `${pending} change${pending > 1 ? "s" : ""} pending sync`}
    </div>
  );
}

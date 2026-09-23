"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Prominent nudge to turn on push so alerts arrive instantly (with sound) instead
 * of waiting for the in-app poll. Shows only when push is supported and not yet
 * enabled on this device. Copy is configurable so admin + technician can each
 * describe the alerts they'll receive.
 */
export function PushEnableBanner({
  title = "Turn on instant alerts",
  description = "Get new job assignments the moment an admin assigns you.",
}: {
  title?: string;
  description?: string;
} = {}) {
  const { supported, subscribed, busy, subscribe } = usePushNotifications();

  if (!supported || subscribed) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-brand-800">🔔 {title}</p>
        <p className="text-xs text-brand-700">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => subscribe()}
        disabled={busy}
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "…" : "Enable"}
      </button>
    </div>
  );
}

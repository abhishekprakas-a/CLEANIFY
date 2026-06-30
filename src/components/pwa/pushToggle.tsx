"use client";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushToggle() {
  const { supported, subscribed, busy, subscribe, unsubscribe } =
    usePushNotifications();

  if (!supported) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>Notifications</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {subscribed
              ? "You'll be notified about new job assignments."
              : "Enable push alerts for new jobs."}
          </p>
        </div>
        <Button
          size="sm"
          variant={subscribed ? "ghost" : "primary"}
          disabled={busy}
          onClick={() => (subscribed ? unsubscribe() : subscribe())}
        >
          {busy ? "…" : subscribed ? "Disable" : "Enable"}
        </Button>
      </div>
    </Card>
  );
}

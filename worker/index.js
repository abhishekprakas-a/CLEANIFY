/* eslint-disable */
/* global self, clients */
// Custom service-worker logic merged into the next-pwa generated worker.
// Handles web-push notifications, notification clicks, and a background-sync
// hook that tells open clients to flush their offline outbox.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: "Water Tank Cleaning",
      body: event.data && event.data.text(),
    };
  }

  const title = payload.title || "Water Tank Cleaning";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/technician" },
    tag: payload.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/technician";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && "focus" in client)
            return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      }),
  );
});

// Background Sync: when connectivity returns, ask any open client to replay its
// offline outbox. (The client also replays on the window 'online' event.)
self.addEventListener("sync", (event) => {
  if (event.tag === "wtcs-sync-outbox") {
    event.waitUntil(
      clients.matchAll({ includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: "FLUSH_OUTBOX" });
        }
      }),
    );
  }
});

# Technician PWA

> The technician portal is an installable, offline-capable Progressive Web App:
> service-worker caching, an offline outbox with background sync, Web Push
> notifications, an install prompt, and a mobile-first dashboard.

---

## 1. Configuration

`next-pwa` (Workbox) wires up the service worker in [`next.config.mjs`](../next.config.mjs):

- **`dest: public`, `register`, `skipWaiting`** — auto-register, take control fast.
- **`disable` in development** — the SW only runs in a production build.
- **`fallbacks.document: "/offline"`** — failed navigations render
  [`/offline`](../src/app/offline/page.tsx).
- **`customWorkerDir: "worker"`** — [`worker/index.js`](../worker/index.js) is
  merged into the generated SW for push + sync handlers.
- **`runtimeCaching`**:
  | Pattern | Strategy | Purpose |
  | --- | --- | --- |
  | navigations | NetworkFirst | app shell offline |
  | `/api/(jobs\|attendance\|auth/me)` GET | NetworkFirst | last data available offline |
  | static assets | StaleWhileRevalidate | fast loads |

> The SW only exists after `npm run build && npm run start` — test PWA behaviour
> there, not in `npm run dev`.

---

## 2. Manifest & icons

[`src/app/manifest.ts`](../src/app/manifest.ts) defines an installable app
(`display: standalone`, `start_url: /technician`, theme color, **shortcuts** to
Jobs and Attendance). Icons live in `public/icons/` — see that folder's README to
generate `icon-192.png`, `icon-512.png`, and a maskable variant.

---

## 3. Offline strategy

### Reading data offline — job cache

[`useAssignedJobs`](../src/hooks/useAssignedJobs.ts) hydrates instantly from a
localStorage cache ([`jobCache`](../src/lib/offline/jobCache.ts)), then refreshes
from the network. If the fetch fails (offline) it keeps the cached list and flags
`fromCache`. Workbox's NetworkFirst rule caches the API response too.

### Writing data offline — outbox + background sync

Mutations go through [`offlineMutate`](../src/lib/offline/mutate.ts):

```
offlineMutate(url, method, body, label)
  online  → fetch immediately
  offline → enqueue in the localStorage outbox + request a background sync
```

[`useOfflineSync`](../src/hooks/useOfflineSync.ts) replays the outbox:

1. on the window **`online`** event,
2. on a **`FLUSH_OUTBOX`** message from the SW's `sync` handler,
3. once on mount.

Each item is removed on success (or on a 4xx that can never succeed); a 5xx/offline
stops the run to retry later. [`OfflineBanner`](../src/components/pwa/offlineBanner.tsx)
shows offline state and the pending count. Attendance check-in/out uses this path,
so a technician can clock in with no signal and it syncs on reconnect.

---

## 4. Push notifications

| Piece                          | File                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Subscribe/unsubscribe (client) | [`usePushNotifications`](../src/hooks/usePushNotifications.ts)                                      |
| Toggle UI                      | [`PushToggle`](../src/components/pwa/pushToggle.tsx) (profile page)                                 |
| Store subscription             | `POST/DELETE /api/push/subscribe` → [`notificationService`](../src/services/notificationService.ts) |
| Subscription model             | [`pushSubscriptionModel`](../src/models/pushSubscriptionModel.ts)                                   |
| SW display                     | [`worker/index.js`](../worker/index.js) `push` / `notificationclick`                                |
| Send                           | `notificationService.notifyUser(userId, { title, body, url })`                                      |

**Setup:** generate VAPID keys with `npx web-push generate-vapid-keys`, set
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Push degrades
gracefully (the toggle hides) when unset. Dead subscriptions (404/410) are pruned
automatically on send.

> Wire `notificationService.notifyUser` into events that matter — e.g. call it
> from `schedulingService.assign` to alert a technician of a new job.

---

## 5. Install prompt

[`useInstallPrompt`](../src/hooks/useInstallPrompt.ts) captures
`beforeinstallprompt` and detects standalone mode;
[`InstallButton`](../src/components/pwa/installButton.tsx) appears on the dashboard
and profile when installable, and hides once installed.

---

## 6. Technician dashboard & screens

Mobile-first shell ([`(technician)/layout.tsx`](<../src/app/(technician)/layout.tsx>)):
a top bar, the offline banner, and a fixed bottom nav (Home · Jobs · Attendance ·
Profile), constrained to `max-w-md`.

| Screen                                | Content                                                                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home (`/technician`)                  | [`TechnicianDashboard`](../src/components/technician/technicianDashboard.tsx) — greeting, **attendance status** + check-in/out (offline-aware), **active/today job counts**, **assigned jobs** list (offline-cached), install button |
| Jobs (`/technician/jobs`)             | Full assigned-jobs list (cached)                                                                                                                                                                                                     |
| Attendance (`/technician/attendance`) | Offline-aware check-in/out + recent history                                                                                                                                                                                          |
| Profile (`/technician/profile`)       | Account info, **push toggle**, install, log out                                                                                                                                                                                      |

---

## 7. Testing the PWA

```bash
npm run build && npm run start
```

- Install via the browser's install affordance or the in-app button.
- DevTools → Application → Service Workers / Manifest to inspect.
- Toggle "Offline" in DevTools → check the banner appears, jobs still render from
  cache, and a check-in queues then syncs when you go back online.

---

## 8. Notes & future work

- **Outbox storage** is localStorage (simple, synchronous). Move to IndexedDB if
  payloads grow large or you need durability guarantees.
- **Conflict handling** on replay is last-write-wins; the server still validates
  (e.g. duplicate check-in returns 409 and the item is dropped).
- **Icons** are placeholders — generate real PNGs before shipping.

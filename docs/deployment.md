# Deployment Guide

> How to ship the Water Tank Cleaning Service Management System to production —
> on a container platform or on Vercel — plus the hardening that ships with it.

---

## 1. Prerequisites

| Dependency    | Notes                                                        |
| ------------- | ------------------------------------------------------------ |
| MongoDB       | Atlas (recommended) or self-hosted ≥ 6                       |
| Cloudflare R2 | Bucket + S3 API token, CORS allowing `PUT` from your domain  |
| VAPID keys    | For Web Push (optional) — `npx web-push generate-vapid-keys` |
| Node 22       | For local builds (the Docker image uses `node:22-alpine`)    |

See [`envGuide.md`](./envGuide.md) for every environment variable.

---

## 2. Build & run

```bash
npm ci
npm run build          # generates .next (standalone) + service worker
npm run start          # or: node .next/standalone/server.js
```

`next.config.mjs` sets `output: "standalone"`, so the build produces a
self-contained server in `.next/standalone`.

---

## 3. Docker

```bash
docker build -t wtcs .
docker run -p 3000:3000 --env-file .env wtcs
```

- The multi-stage [`Dockerfile`](../Dockerfile) builds the standalone server and
  runs it as a non-root user.
- The build stage sets **placeholder** `MONGODB_URI` / `JWT_SECRET` so the static
  env validation passes; the **real** values come from the container environment at
  runtime (`--env-file` / orchestrator secrets).
- A `HEALTHCHECK` hits `/api/health` (which pings MongoDB).

### docker-compose (example)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    restart: unless-stopped
```

---

## 4. Vercel

1. Import the repo; framework auto-detected as Next.js.
2. Add all env vars from [`envGuide.md`](./envGuide.md) (Production + Preview).
3. Deploy. `output: standalone` is ignored by Vercel (it uses its own runtime) —
   that's fine.
4. After the first deploy, run the seed once against production:
   `MONGODB_URI=… npm run seed`, then rotate the admin password.

> **Note on rate limiting:** the in-memory limiter (`lib/rateLimit.ts`) is
> per-instance. On Vercel/multi-instance, back it with Redis (Upstash) for a shared
> limit — same interface.

---

## 5. Health, probes & observability

- **Health:** `GET /api/health` → `200 {status:"ok"}` when the DB is reachable,
  `503` otherwise. Wire it to your platform's liveness/readiness probe.
- **Logs:** `lib/logger.ts` emits JSON lines; 5xx and unhandled errors are logged
  by the central `handleRoute`. Point your platform's log drain at stdout.
- **Audit:** sensitive actions are recorded in `auditLogModel` and viewable at
  `/audit` (admin).

---

## 6. Security hardening (built-in)

| Concern               | Implementation                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Security headers      | `next.config.mjs` `headers()` — HSTS, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy |
| Auth                  | httpOnly cookies, rotating refresh tokens, bcrypt — [`authenticationFlow.md`](./authenticationFlow.md)  |
| Rate limiting         | login (5/min/IP+email) and forgot-password (3/10min/IP)                                                 |
| Input validation      | Zod at every route boundary; `lib/sanitize.ts` (regex escape, mongo-operator stripping)                 |
| Role/permission gates | edge middleware + per-handler `requireRole`/`requirePermission`                                         |
| `poweredByHeader` off | no framework fingerprint                                                                                |

> **CSP:** a Content-Security-Policy is intentionally not set by default (it needs
> per-app tuning for Next's inline runtime). Add one once you've verified it doesn't
> break the app — start from `default-src 'self'; img-src 'self' data: blob: https:`.

---

## 7. Post-deploy checklist

Run through [`productionChecklist.md`](./productionChecklist.md) before going live.
Minimum:

1. All env vars set; `JWT_SECRET` is a long random value.
2. R2 bucket CORS + public domain configured.
3. `npm run seed`, then change the admin password.
4. Health probe green; HTTPS enforced (HSTS).
5. PWA icons replaced with real assets.

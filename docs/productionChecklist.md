# Production Checklist

> Run through this before going live, and after each major release. Items marked
> ✅ ship in the codebase; ☐ are operational steps you perform.

---

## Security

- ✅ httpOnly + Secure (prod) cookies; rotating refresh tokens; bcrypt passwords.
- ✅ Edge middleware role gate + per-handler `requireRole`/`requirePermission`.
- ✅ Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
  Permissions-Policy) via `next.config.mjs`; `poweredByHeader` off.
- ✅ Rate limiting on login + forgot-password.
- ✅ Zod validation at every route; `lib/sanitize.ts` (regex escape, mongo-operator
  stripping); presigned-upload key scoping.
- ☐ Set a long random `JWT_SECRET` (not the example value).
- ☐ Add a tuned **Content-Security-Policy** (see [`deployment.md`](./deployment.md)).
- ☐ Enforce HTTPS at the edge/load balancer (HSTS is already sent).
- ☐ Restrict MongoDB network access (Atlas IP allowlist / VPC peering).
- ☐ Back the rate limiter with Redis if running multiple instances.

## Data & performance

- ✅ Mongoose indexes on every hot path (auth, lookups, dates, status, ratings,
  report fields) — see [`databaseSchema.md`](./databaseSchema.md).
- ✅ Pagination on all list endpoints; `.lean()` reads; `Promise.all` fan-out;
  projections (`.select`) on heavy queries.
- ✅ Serverless-safe pooled DB connection (`lib/dbConnect.ts`).
- ✅ Client-side image compression before upload; direct browser→R2 transfer.
- ✅ Next image optimization (`avif`/`webp`); static assets cached by the SW.
- ☐ Verify indexes built in production (`db.collection.getIndexes()`).
- ☐ Set up DB backups / point-in-time recovery.

## Reliability & UX

- ✅ Error boundaries: route `error.tsx` (admin/technician), `global-error.tsx`,
  `not-found.tsx`.
- ✅ Loading **skeletons** (`loading.tsx`) per route group.
- ✅ **Toast** notifications (`Toaster` + `useToast`).
- ✅ PWA: offline cache, background-sync outbox, install prompt (see [`pwa.md`](./pwa.md)).
- ✅ Audit log of sensitive actions (`/audit`).
- ☐ Replace placeholder **PWA icons** with real assets (`public/icons/`).
- ☐ Wire a real **email provider** in `lib/mailer.ts` (password reset).
- ☐ Configure **VAPID** keys and send push on assignment if desired.

## Observability

- ✅ JSON logger; 5xx/unhandled errors logged centrally.
- ✅ `/api/health` probe (DB ping).
- ☐ Point logs at a drain; add an error reporter (Sentry et al.).
- ☐ Configure uptime monitoring against `/api/health`.

## Quality gates (CI)

- ✅ `npm run typecheck` — passes.
- ✅ `npm run lint` — zero warnings.
- ✅ `npm run format:check` — clean.
- ☐ Run all three in CI on every PR; block merge on failure.
- ☐ Add unit tests for services (esp. the job state machine) and the export utils.

## Responsive / device testing (manual)

- ☐ **Technician PWA** on a real phone: install, check-in (offline → sync),
  reach-site, photo upload (camera + progress + retry), job timeline.
- ☐ **Admin** on desktop + tablet: dashboard charts, schedule calendar
  (month/week/day), tables scroll on narrow widths, modals/prompts usable.
- ☐ Test offline → online transition (DevTools "Offline") and slow-3G throttling.
- ☐ Verify forms are keyboard-navigable and inputs have labels.

## Go-live steps

1. ☐ Provision MongoDB + R2 (CORS + public domain).
2. ☐ Set all env vars (see [`envGuide.md`](./envGuide.md)).
3. ☐ `npm run build` → deploy (Docker or Vercel).
4. ☐ `npm run seed` once → **change the admin password immediately**.
5. ☐ Smoke test: login, create customer → booking → job → schedule → execute →
   approve photos → complete → review → report export.
6. ☐ Confirm health probe green and HTTPS enforced.

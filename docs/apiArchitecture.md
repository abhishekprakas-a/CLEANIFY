# API Architecture

> The system exposes two complementary server surfaces:
> **Route Handlers** (`src/app/api/**/route.ts`) for a clean REST API consumed by
> the technician PWA and client components, and **Server Actions** for admin form
> mutations rendered with Server Components. Both delegate to the same `services/`.

---

## 1. Conventions

### Base URL

`/api` — e.g. `POST /api/auth/login`.

### Response envelope

Every response uses one shape (`lib/apiResponse.ts`):

```jsonc
// success
{ "success": true,  "data": { /* ... */ }, "meta": { /* pagination, optional */ } }
// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { /* field errors */ } } }
```

### Status codes

`200` OK · `201` Created · `400` Validation · `401` Unauthenticated ·
`403` Forbidden (wrong role) · `404` Not found · `409` Conflict (duplicate / illegal
state transition) · `422` Business-rule violation · `500` Unexpected.

### Error codes (stable, machine-readable)

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`INVALID_TRANSITION`, `RATE_LIMITED`, `INTERNAL`.

### Pagination

List endpoints accept `?page=1&limit=20&sort=-createdAt&q=<search>` and return
`meta: { page, limit, total, totalPages }`.

### Auth

A signed JWT travels in an **httpOnly cookie** (name from `AUTH_COOKIE_NAME`).
Clients never read the token. CSRF is mitigated by `SameSite=Lax` + same-origin API.

---

## 2. Authentication flow

Short-lived access JWT + rotating refresh token. Full detail in
[`authenticationFlow.md`](./authenticationFlow.md).

```
POST /api/auth/login   { email, password, remember? }
  → verify active user + bcrypt compare
  → create session (hashed refresh token), sign access JWT { sub, role, …, sid }
  → Set-Cookie wtcs_token (access, path=/) + wtcs_refresh (refresh, path=/api/auth)
  → 200 { user: { …, permissions } }

POST /api/auth/refresh → rotate refresh token, issue new access token → 200 { user }
GET  /api/auth/me      → 200 { user incl. permissions }   (from verified cookie)
POST /api/auth/logout  → revoke session + clear cookies → 200
POST /api/auth/forgotPassword { email }            → always 200 (no enumeration)
POST /api/auth/resetPassword  { token, password }  → set password, revoke sessions
```

`middleware.ts` (Edge) verifies the access cookie on every protected route and
enforces role-to-route-group rules **before** the handler runs. Handlers/actions
re-assert through `lib/authGuard.ts` (`requireUser`, `requireRole`,
`requirePermission`). When the access token expires, the client (`hooks/useApi`)
transparently calls `/api/auth/refresh` once and retries.

---

## 3. Endpoint catalogue

> R = allowed roles. `A` = admin/calling staff, `T` = technician.

### Auth

| Method | Path                       | R   | Purpose                                 |
| ------ | -------------------------- | --- | --------------------------------------- |
| POST   | `/api/auth/login`          | –   | Authenticate, open session, set cookies |
| POST   | `/api/auth/refresh`        | –\* | Rotate refresh token + new access token |
| POST   | `/api/auth/logout`         | A,T | Revoke session, clear cookies           |
| GET    | `/api/auth/me`             | A,T | Current user + resolved permissions     |
| POST   | `/api/auth/forgotPassword` | –   | Email a reset link (always 200)         |
| POST   | `/api/auth/resetPassword`  | –   | Set a new password via token            |

\* `/refresh` requires a valid `wtcs_refresh` cookie rather than the access token.

### Users (staff management)

| Method | Path             | R   | Purpose                            |
| ------ | ---------------- | --- | ---------------------------------- |
| GET    | `/api/users`     | A   | List staff (filter by role/status) |
| POST   | `/api/users`     | A   | Create admin/technician            |
| GET    | `/api/users/:id` | A   | Get one                            |
| PATCH  | `/api/users/:id` | A   | Update / deactivate                |

### Customers

| Method | Path                         | R   | Purpose                                        |
| ------ | ---------------------------- | --- | ---------------------------------------------- |
| GET    | `/api/customers`             | A   | Search (`q`) + filter (`status`) + paginate    |
| POST   | `/api/customers`             | A   | Create                                         |
| GET    | `/api/customers/:id`         | A   | Get one                                        |
| PATCH  | `/api/customers/:id`         | A   | Update                                         |
| DELETE | `/api/customers/:id`         | A   | Delete (soft — deactivates if it has bookings) |
| GET    | `/api/customers/:id/history` | A   | Customer + bookings + jobs + stats             |

See [`customerModule.md`](./customerModule.md) for search/filter/delete semantics.

### Bookings

| Method | Path                           | R   | Purpose                                                       |
| ------ | ------------------------------ | --- | ------------------------------------------------------------- |
| GET    | `/api/bookings`                | A   | List: search (`q`) + filter (`status`,`from`,`to`) + paginate |
| POST   | `/api/bookings`                | A   | Create booking (status `pending`)                             |
| GET    | `/api/bookings/:id`            | A   | Detail                                                        |
| PATCH  | `/api/bookings/:id`            | A   | Edit details                                                  |
| POST   | `/api/bookings/:id/reschedule` | A   | Reschedule (date/time → `rescheduled`)                        |
| POST   | `/api/bookings/:id/cancel`     | A   | Cancel with reason                                            |
| GET    | `/api/bookings/:id/history`    | A   | Booking + status history                                      |

See [`bookingWorkflow.md`](./bookingWorkflow.md) for the status lifecycle.

### Scheduling & Jobs

| Method | Path                       | R   | Purpose                                     |
| ------ | -------------------------- | --- | ------------------------------------------- |
| POST   | `/api/jobs`                | A   | Create job from a booking (`pending`)       |
| GET    | `/api/jobs`                | A   | All jobs (filter status/date/technician)    |
| GET    | `/api/jobs/assigned`       | T   | Jobs assigned to the calling technician     |
| GET    | `/api/jobs/:id`            | A,T | Job detail (T only if assigned)             |
| GET    | `/api/jobs/:id/timeline`   | A,T | Status-history audit trail (names resolved) |
| PATCH  | `/api/jobs/:id/assign`     | A   | Assign a technician (+ optional date/time)  |
| POST   | `/api/jobs/:id/reassign`   | A   | Move to a different technician              |
| POST   | `/api/jobs/:id/reschedule` | A   | Change the job's date/time                  |
| POST   | `/api/jobs/:id/transition` | A,T | Advance the execution workflow              |
| POST   | `/api/jobs/:id/cancel`     | A   | Cancel job                                  |

### Schedule (calendar)

| Method | Path                                             | R   | Purpose                           |
| ------ | ------------------------------------------------ | --- | --------------------------------- |
| GET    | `/api/schedule?view=&date=&technicianId=`        | A   | Daily / weekly / monthly schedule |
| GET    | `/api/schedule/availability?technicianId=&date=` | A   | Technician load + availability    |

See [`schedulingArchitecture.md`](./schedulingArchitecture.md) for conflict
detection, capacity rules, and the calendar UI.

### Push (PWA notifications)

| Method | Path                  | R   | Purpose                              |
| ------ | --------------------- | --- | ------------------------------------ |
| POST   | `/api/push/subscribe` | A,T | Save this device's push subscription |
| DELETE | `/api/push/subscribe` | A,T | Remove a subscription by endpoint    |

See [`pwa.md`](./pwa.md) for the offline + push architecture.

### Photos

| Method | Path                      | R   | Purpose                                    |
| ------ | ------------------------- | --- | ------------------------------------------ |
| POST   | `/api/photos/presign`     | T   | Get presigned R2 PUT URL (no record yet)   |
| POST   | `/api/photos/confirm`     | T   | Create the photo record after upload       |
| GET    | `/api/photos?job=:id`     | A,T | List job photos                            |
| GET    | `/api/photos/pending`     | A   | Jobs awaiting approval + their gate photos |
| POST   | `/api/photos/:id/approve` | A   | Approve photo (advances the gate)          |
| POST   | `/api/photos/:id/reject`  | A   | Reject with reason (sends job back)        |

See [`photoArchitecture.md`](./photoArchitecture.md) for the upload pipeline.

### Attendance

| Method | Path                       | R   | Purpose                                       |
| ------ | -------------------------- | --- | --------------------------------------------- |
| POST   | `/api/attendance/checkIn`  | T   | Check in (+geo); blocks duplicate check-in    |
| POST   | `/api/attendance/checkOut` | T   | Check out; compute hours + final status       |
| GET    | `/api/attendance/today`    | T   | Today's record for the technician             |
| GET    | `/api/attendance/history`  | T   | Recent records for the current technician     |
| GET    | `/api/attendance`          | A   | Paginated raw records (filter `userId`/dates) |
| GET    | `/api/attendance/report`   | A   | Daily / weekly / monthly report (`?period=`)  |

See [`attendanceWorkflow.md`](./attendanceWorkflow.md) for status rules + reports.

### Reviews

| Method | Path                          | R   | Purpose                                                 |
| ------ | ----------------------------- | --- | ------------------------------------------------------- |
| GET    | `/api/reviews`                | A   | Paginated history (filter `technicianId`)               |
| POST   | `/api/reviews`                | A   | Record a review for a completed job                     |
| GET    | `/api/reviews/summary`        | A   | Average, distribution, satisfaction, technician ratings |
| GET    | `/api/reviews/reviewableJobs` | A   | Completed jobs with no review yet                       |

See [`reviewModule.md`](./reviewModule.md) for metrics and the rating component.

### Dashboard & Reports

| Method | Path                        | R   | Purpose                                            |
| ------ | --------------------------- | --- | -------------------------------------------------- |
| GET    | `/api/dashboard/summary`    | A   | Admin dashboard: KPIs, attendance, reviews, charts |
| GET    | `/api/dashboard/technician` | T   | Technician dashboard: counts, schedule, progress   |
| GET    | `/api/reports/attendance`   | A   | Attendance report                                  |
| GET    | `/api/reports/jobs`         | A   | Job completion report                              |
| GET    | `/api/reports/technicians`  | A   | Technician performance report                      |
| GET    | `/api/reports/reviews`      | A   | Customer review report                             |
| GET    | `/api/reports/productivity` | A   | Monthly productivity report (`?year=`)             |

See [`dashboard.md`](./dashboard.md) for dashboards and [`reports.md`](./reports.md)
for report shapes, filters, and CSV/Excel/PDF export.

### Audit & health

| Method | Path          | R   | Purpose                             |
| ------ | ------------- | --- | ----------------------------------- |
| GET    | `/api/audit`  | A   | Audit-log entries (filter `action`) |
| GET    | `/api/health` | –   | Liveness/readiness probe (DB ping)  |

`/api/health` is unauthenticated (excluded from the middleware matcher) for
platform probes.

---

## 3a. Hardening

- **Security headers** (`next.config.mjs`): HSTS, `X-Frame-Options: DENY`,
  `nosniff`, Referrer-Policy, Permissions-Policy; `poweredByHeader` off.
- **Rate limiting** (`lib/rateLimit.ts`): login (5/min/IP+email), forgot-password
  (3/10min/IP) → `429 RATE_LIMITED`.
- **Validation/sanitization**: Zod at every boundary + `lib/sanitize.ts`.
- **Logging** (`lib/logger.ts`): JSON lines; `handleRoute` logs 5xx/unhandled.
- **Audit** (`lib/audit.ts` + `auditLogModel`): sensitive actions recorded.

See [`deployment.md`](./deployment.md) and
[`productionChecklist.md`](./productionChecklist.md).

---

## 4. Route Handler pattern

Every handler follows the same five steps. Pseudocode:

```ts
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole(req, [roles.admin]); // 1. auth + role
    const body = customerCreateSchema.parse(await req.json()); // 2. validate (Zod)
    const customer = await customerService.create(body, user); // 3. service
    return created(customer); // 4. envelope
  }); // 5. handleRoute maps thrown ApiError/ZodError → standard error response
}
```

- `handleRoute` is a central wrapper (`lib/apiHandler.ts`) that catches
  `ApiError`, `ZodError`, and unknown errors and serialises them consistently.
- Services throw typed `ApiError`s (`ApiError.notFound()`, `ApiError.conflict()`,
  `ApiError.invalidTransition()`), keeping handlers thin.

---

## 5. Server Actions pattern (admin mutations)

```ts
"use server";
export async function createBookingAction(formData: FormData) {
  const user = await requireRole(null, [roles.admin]); // reads cookie via headers()
  const input = bookingCreateSchema.parse(toObject(formData));
  const booking = await bookingService.create(input, user);
  revalidatePath(routes.admin.bookings);
  return booking;
}
```

Server actions and route handlers are **interchangeable entry points** over the
same services, chosen per surface: actions for admin SSR forms, route handlers for
the PWA / fetch-based clients.

---

## 6. Validation strategy

- One Zod schema per input, in `src/schemas/`, imported by **both** the client
  (React Hook Form via `@hookform/resolvers/zod`) and the server.
- The client gets instant UX; the server never trusts the client and re-parses.
- `ZodError` → `400 VALIDATION_ERROR` with `details` = flattened field errors.

---

## 7. Security checklist

- httpOnly + Secure + SameSite cookies; no token in `localStorage`.
- Role re-checked server-side on every mutation (defence in depth).
- Mongoose `select:false` on `passwordHash`; never serialised.
- Presigned uploads are short-lived (`R2_PRESIGNED_EXPIRES_SECONDS`) and scoped to a
  single key/content-type.
- All list endpoints paginated to bound payloads.
- Input length/shape bounded by Zod (e.g. ratings 1–5, phone regex).
- Centralised error handler never leaks stack traces in production.

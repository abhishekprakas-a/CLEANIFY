# Project Architecture

> Water Tank Cleaning Service Management System — a production-ready full-stack
> application built on the Next.js App Router with TypeScript, MongoDB, and an
> Cloudflare R2 object store (S3-compatible API).

---

## 1. Overview

The system digitises the end-to-end operation of a water-tank cleaning business:
customers are captured by calling staff, bookings are scheduled, technicians are
dispatched, jobs are executed in the field through a PWA, before/after photos are
uploaded and approved, and customers leave reviews. Admins monitor everything
through dashboards and reports.

There are **two roles**:

| Role         | Also called            | Primary surface         | Responsibilities                                                          |
| ------------ | ---------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `admin`      | Calling Staff / Office | Desktop web (dashboard) | Customers, bookings, scheduling, approvals, reports, attendance oversight |
| `technician` | Field Staff            | Mobile PWA              | Attendance check-in/out, assigned jobs, status updates, photo upload      |

> The brief lists "Admin / Calling Staff" as a single role group. We model it as
> the `admin` role. If office staff later need reduced privileges, a `callingStaff`
> role can be added without schema changes (see `constants/roles.ts`).

---

## 2. Technology Stack

| Concern        | Choice                                 | Notes                                                        |
| -------------- | -------------------------------------- | ------------------------------------------------------------ |
| Framework      | Next.js (App Router) + TypeScript      | Server Components, Route Handlers, Server Actions            |
| Styling        | Tailwind CSS                           | Utility-first, mobile-first PWA                              |
| Database       | MongoDB + Mongoose                     | Document model fits jobs/photos well                         |
| Auth           | JWT (jose) + httpOnly cookie           | Role-based access via middleware                             |
| File storage   | Cloudflare R2 via `@aws-sdk/client-s3` | S3-compatible API, presigned direct uploads, low egress cost |
| State (client) | Zustand                                | Auth session + UI state                                      |
| Validation     | Zod + React Hook Form                  | One schema shared by client + server                         |
| PWA            | next-pwa (Workbox)                     | Offline shell + installable technician app                   |
| Charts         | Recharts                               | Dashboard analytics                                          |
| Tables         | TanStack Table                         | Server-driven, sortable, paginated tables                    |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          Clients                             │
│   Admin Web (desktop)            Technician PWA (mobile)      │
└───────────────┬──────────────────────────┬───────────────────┘
                │  HTTPS (cookie JWT)       │
┌───────────────▼──────────────────────────▼───────────────────┐
│                    Next.js (App Router)                       │
│                                                               │
│  middleware.ts ── edge auth + role gate ──────────────────┐   │
│                                                           │   │
│  app/(admin)/*        Server Components + Server Actions   │   │
│  app/(technician)/*   Server Components + Server Actions   │   │
│  app/api/*            Route Handlers (REST surface)        │   │
│                              │                            │   │
│                              ▼                            │   │
│   services/  ── business logic (role-agnostic)            │   │
│        │            │              │                      │   │
│        ▼            ▼              ▼                      │   │
│   models/      lib/storageClient  lib/jwt                 │   │
│   (Mongoose)   (uploads)       (sign/verify)              │   │
└────────┬───────────────┬───────────────────────────────────┘
         ▼               ▼
   MongoDB Atlas    Cloudflare R2 bucket
```

### Request lifecycle

1. A request hits `middleware.ts` (Edge). The JWT cookie is verified and the role
   is checked against the route group. Unauthorised requests are redirected
   (pages) or rejected with `401/403` (API).
2. The route handler / server action validates input with a **Zod schema**.
3. It calls a **service** function. Services contain all business logic and are the
   only layer that talks to **models** and **lib** (R2 storage, etc.).
4. The service returns plain DTOs; the handler wraps them in the standard
   `apiResponse` envelope.

---

## 4. Layered Design & Dependency Rule

```
app (routes/UI)  ──▶  services  ──▶  models / lib
schemas (Zod)    ──▶  used by app + services for validation
types            ──▶  shared everywhere (no runtime deps)
constants        ──▶  shared everywhere
```

**Dependency rule:** dependencies point downward only.

- `app` may import `services`, `schemas`, `components`, `store`, `hooks`, `constants`, `types`.
- `services` may import `models`, `lib`, `constants`, `types`. **Never** import `app` or React.
- `models` may import `lib` (db) and `types`. Nothing else.
- `components`, `hooks`, `store` are client-side and must **never** import `services` or `models` directly — they talk to the server through API routes / server actions.

This keeps business logic testable and prevents Mongoose from leaking into the client bundle.

---

## 5. Folder Structure

```
.
├── docs/                       # This documentation set
├── public/                     # Static assets, manifest.json, icons, sw.js (generated)
├── src/
│   ├── app/                    # App Router (routes, layouts, API)
│   │   ├── (auth)/             # Public auth routes (login)
│   │   ├── (admin)/            # Admin/calling-staff protected routes
│   │   ├── (technician)/       # Technician PWA protected routes
│   │   ├── api/                # Route Handlers (REST surface)
│   │   ├── layout.tsx          # Root layout (fonts, providers)
│   │   ├── globals.css         # Tailwind entry
│   │   └── manifest.ts         # PWA manifest (typed)
│   ├── components/             # Reusable UI (ui/, layout/, charts/, tables/)
│   ├── services/               # Business logic (auth, customer, booking, job…)
│   ├── hooks/                  # Client hooks (useAuth, useDebounce…)
│   ├── schemas/                # Zod schemas (shared client + server)
│   ├── models/                 # Mongoose models
│   ├── lib/                    # Infra: db, jwt, storage (R2), http helpers, auth guard
│   ├── constants/              # Enums, roles, route maps, status machines
│   ├── store/                  # Zustand stores
│   ├── types/                  # Shared TypeScript types/DTOs
│   └── scripts/                # seed.ts and other CLI scripts
├── middleware.ts               # Edge auth + role-based routing
├── next.config.mjs             # Next + next-pwa config
├── tailwind.config.ts
├── tsconfig.json               # "@/*" -> "src/*"
└── .env.example
```

> **Naming:** camelCase for files, folders, variables, functions, components export
> names, services, models, and types. Next.js reserved files (`page.tsx`,
> `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`) keep their framework-required
> lowercase names. Route group folders use camelCase (e.g. `customerManagement`).

---

## 6. Module Map

| Module                  | Routes (app)                                                                      | Service                                                  | Models                                                      |
| ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Authentication & Roles  | `(auth)/*`, `api/auth/*`, `api/users/*`                                           | `authService`, `sessionService`, `roleService`           | `userModel`, `roleModel`, `permissionModel`, `sessionModel` |
| Attendance              | `(technician)/attendance`, `(admin)/attendance`, `api/attendance/*`               | `attendanceService`                                      | `attendanceModel`, `userModel`                              |
| Customer Management     | `(admin)/customers/*`, `api/customers/*`                                          | `customerService`                                        | `customerModel`, `bookingModel`, `jobModel`                 |
| Booking                 | `(admin)/bookings/*`, `api/bookings/*`                                            | `bookingService`                                         | `bookingModel`, `customerModel`                             |
| Scheduling              | `(admin)/schedule`, `api/schedule/*`, `api/jobs/:id/{assign,reassign,reschedule}` | `schedulingService`                                      | `jobModel`, `jobAssignmentModel`, `userModel`               |
| Job Workflow            | `(admin)/jobs`, `(technician)/jobs`, `api/jobs/*`                                 | `jobService`                                             | `jobModel`                                                  |
| Technician PWA          | `(technician)/*`, `api/push/*`                                                    | `jobService`, `attendanceService`, `notificationService` | `jobModel`, `attendanceModel`, `pushSubscriptionModel`      |
| Photo Upload & Approval | `(technician)/jobs/*`, `(admin)/approvals`, `api/photos/*`                        | `photoService`                                           | `photoModel`, `jobModel`                                    |
| Reviews                 | `(admin)/reviews`, `api/reviews/*`                                                | `reviewService`                                          | `reviewModel`, `jobModel`                                   |
| Dashboard               | `(admin)/dashboard`, `(technician)/*`, `api/dashboard/*`                          | `dashboardService`                                       | aggregates all                                              |
| Reports                 | `(admin)/reports`, `api/reports/*`                                                | `reportService`                                          | aggregates jobs, attendance, reviews, users                 |

See [`jobWorkflow.md`](./jobWorkflow.md) for the job state machine and
[`databaseSchema.md`](./databaseSchema.md) for full schemas.

---

## 7. Authentication & Authorisation

- **Login** issues a short-lived access JWT (`jose`, `sub`/`role`/`name`/`sid`) in
  an **httpOnly, SameSite=Lax, Secure** cookie, plus a **rotating refresh token**
  persisted (hashed) in `sessionModel` and stored in a second cookie scoped to
  `/api/auth`. "Remember me" extends the refresh lifetime.
- **Token refresh** — when the access token expires, the client (`hooks/useApi`)
  transparently calls `/api/auth/refresh`, which rotates the refresh token and
  mints a new access token.
- **`middleware.ts`** runs on the Edge for all matched routes, verifies the access
  token, and enforces role → route-group mapping. Pages redirect to `/login`; API
  returns `401`/`403`.
- **RBAC** — `roleModel` + `permissionModel` hold roles and their permission keys
  (seeded from `constants/permissions.ts`). Guards in `lib/authGuard.ts`
  (`requireRole`, `requirePermission`) re-check inside handlers as defence in depth.
- **Password reset** — one-time hashed token with expiry; completing a reset
  revokes all of the user's sessions.
- Passwords are hashed with **bcrypt** (`lib/password.ts`); plaintext and tokens
  are never stored in the clear or logged.

Full detail in [`authenticationFlow.md`](./authenticationFlow.md).

---

## 8. File Storage (Photos)

Technician photos never stream through the Next.js server:

1. The technician requests a **presigned PUT URL** from `POST /api/photos/presign`
   (the server validates the job + role and records an intended `photoModel` doc).
2. The browser uploads the file **directly to R2**.
3. The technician confirms via `POST /api/photos/confirm`, flipping the photo to
   `uploaded` and advancing the job.
4. Admin approves/rejects in the approvals queue; on rejection the technician
   re-uploads.

This keeps the serverless function memory/time low and scales to large images.
R2 is used for its S3-compatible API and **zero egress fees**, which keeps the
cost of serving job photos low.

---

## 9. State Management

- **Server state** (lists, jobs, customers) is fetched in Server Components or via
  route handlers — it is _not_ duplicated into a global client store.
- **Zustand** holds only genuinely client-side state:
  - `authStore` — the current session user (hydrated from `/api/auth/me`).
  - `uiStore` — sidebar, modals, toasts, offline banner.

---

## 10. PWA & Offline

- `next-pwa` generates the service worker (disabled in dev).
- `app/manifest.ts` defines an installable app; technician icons + standalone display.
- Strategy: app-shell precache + network-first for API, with an offline fallback
  page. Attendance/job-status mutations queue optimistically where safe.

---

## 11. Scalability & Production Concerns

- **DB connection pooling** via a cached global mongoose connection
  (`lib/dbConnect.ts`) — critical for serverless to avoid connection storms.
- **Indexes** declared on every model for the hot query paths (see schema doc).
- **Stateless app tier** — all state in MongoDB / R2, so it scales horizontally.
- **Standard error envelope** + central `lib/apiError.ts` for predictable clients.
- **Validation at the boundary** — every external input passes a Zod schema.
- **Pagination by default** on all list endpoints (`page`, `limit`, `sort`).
- **Audit fields** (`createdBy`, `createdAt`, `updatedAt`) on operational records.

---

## 12. Environment Configuration

All configuration is via environment variables; see [`.env.example`](../.env.example)
and [`developmentGuide.md`](./developmentGuide.md). The app reads them through a
single typed accessor (`lib/env.ts`) that fails fast at boot if required values
are missing.

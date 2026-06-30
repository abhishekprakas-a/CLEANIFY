# Folder Structure

> Why every folder exists, what belongs in it, and what must **not**. The guiding
> rule is the layered dependency direction **app → services → models / lib**, with
> `schemas`, `types`, and `constants` shared across layers. See
> [`projectArchitecture.md`](./projectArchitecture.md) for the architectural reasoning.

---

## Top level

```
.
├── docs/                  # Project documentation (this set)
├── public/                # Static assets, PWA icons, generated service worker
├── src/                   # All application code (see below)
├── middleware.ts          # Edge auth + role-based route gate
├── next.config.mjs        # Next.js + next-pwa config
├── tailwind.config.ts     # Tailwind theme + content globs
├── postcss.config.mjs     # PostCSS (tailwind + autoprefixer)
├── tsconfig.json          # TS config + "@/*" -> "src/*" path alias
├── .eslintrc.json         # ESLint (next/core-web-vitals + prettier)
├── .prettierrc.json       # Prettier formatting rules
├── .prettierignore        # Files Prettier skips
├── .env.example           # Documented environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## `src/` — application code

```
src/
├── app/            Routes, layouts, and the REST API (App Router)
├── components/     Reusable React components (presentational + client widgets)
├── services/       Business logic — the only layer that talks to models + storage
├── schemas/        Zod validation schemas (shared by client + server)
├── models/         Mongoose models (server-only)
├── lib/            Infrastructure helpers (db, auth, jwt, storage, http)
├── store/          Zustand client stores
├── hooks/          Reusable client hooks
├── constants/      Enums, roles, route maps, the job state machine
├── types/          Shared TypeScript types / DTOs (no runtime code)
└── scripts/        CLI scripts (seed.ts)
```

### `src/app/` — routing & API

```
app/
├── (auth)/                 # Public route group — login
│   └── login/page.tsx
├── (admin)/                # Admin/calling-staff group (role-guarded in layout.tsx)
│   ├── layout.tsx          # Sidebar + topbar shell; redirects non-admins
│   └── dashboard/page.tsx
├── (technician)/           # Technician PWA group (role-guarded in layout.tsx)
│   ├── layout.tsx          # Mobile shell + bottom nav
│   └── technician/page.tsx
├── api/                    # Route Handlers (REST surface)
│   ├── auth/               # login, logout, me
│   ├── users/              # staff management
│   ├── customers/          # + [id]
│   ├── bookings/           # + [id]
│   ├── jobs/               # + [id]/{assign,transition,cancel}, assigned
│   ├── photos/             # presign, confirm, [id]/{approve,reject}
│   ├── attendance/         # checkIn, checkOut, today
│   ├── reviews/
│   ├── dashboard/summary/
│   └── reports/jobs/
├── layout.tsx              # Root layout (html/body, fonts, metadata)
├── globals.css             # Tailwind entry
├── manifest.ts             # Typed PWA manifest
└── page.tsx                # Root — redirects to role home or /login
```

- **Route groups** `(auth)`, `(admin)`, `(technician)` organise routes by audience
  without affecting the URL. Role enforcement lives in each group's `layout.tsx`
  plus the edge `middleware.ts`.
- **Reserved filenames** (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`,
  `error.tsx`) keep their framework casing; everything else is camelCase.
- **API route handlers** are thin: authenticate → validate (Zod) → call a service →
  wrap in the standard response envelope.

### `src/components/`

```
components/
├── ui/            Primitives: button, input, card, badge
├── layout/        Sidebar, topbar (app chrome)
├── auth/          loginForm
└── technician/    attendanceWidget and other field widgets
```

Rules:

- Components are **presentational or client-interactive only**. They never import
  `services/` or `models/` (that would pull Mongoose into the browser bundle).
  They reach the server through `hooks/useApi` or server actions.
- Group by feature once a feature has more than one component.

### `src/services/`

One file per domain: `authService`, `customerService`, `bookingService`,
`jobService`, `attendanceService`, `photoService`, `reviewService`,
`dashboardService`, `reportService`, re-exported from `index.ts`.

- **All business logic lives here.** Services are the only place that imports
  `models/` and storage (`lib/storageClient`).
- Services are framework-agnostic (no React, no `next/*` request objects) so they
  are unit-testable and reusable from both route handlers and server actions.
- They throw typed `ApiError`s; they never format HTTP responses.

### `src/schemas/`

Zod schemas (`authSchema`, `customerSchema`, `bookingSchema`, `jobSchema`,
`attendanceSchema`, `photoSchema`, `reviewSchema`). Each input has one schema used
by **both** the client (React Hook Form) and the server (route handler / action),
so validation rules never drift.

### `src/models/`

Mongoose models, one per collection, each with its `Document` interface, indexes,
and the hot-reload-safe `mongoose.models.X || mongoose.model(...)` guard.
**Server-only.**

### `src/lib/` — infrastructure

```
lib/
├── env.ts            Typed, validated env access (throws at boot if missing)
├── dbConnect.ts      Cached, pooled Mongoose connection (serverless-safe)
├── jwt.ts            Sign/verify session JWTs (jose, edge-compatible)
├── password.ts       bcrypt hash/verify
├── cookies.ts        Set/clear the httpOnly auth cookie
├── authGuard.ts      getSessionUser / requireUser / requireRole
├── storageClient.ts  Cloudflare R2 (S3-compatible) client + presigned uploads
├── apiError.ts       Typed ApiError with HTTP status + code
├── apiResponse.ts    ok / created / failure envelope helpers
├── apiHandler.ts     handleRoute wrapper (maps errors to the envelope)
├── pagination.ts     parseListQuery / buildMeta
├── serialize.ts      Mongoose doc -> JSON-safe DTO (_id -> id)
└── cn.ts             Tailwind className merge
```

### `src/store/`

Zustand stores for genuinely client-side state only:

- `authStore` — current session user (hydrated from `/api/auth/me`).
- `uiStore` — sidebar, offline banner, toasts.

Server data (lists, jobs) is **not** duplicated here; it is fetched per request.

### `src/hooks/`

`useAuth` (hydrate session), `useApi` (typed fetch that unwraps the envelope),
`useDebounce`. All `"use client"`.

### `src/constants/`

`roles`, `jobStatus` (+ the `jobTransitions` / `jobTransitionRoles` **state
machine**), `routes`, and other enums, re-exported from `index.ts`. Enums are
defined **once here** and reused by models, schemas, and UI — never hard-coded.

### `src/types/`

Shared, runtime-free TypeScript types: domain entities (`User`, `Customer`,
`Booking`, `Job`, …), the API envelope (`ApiResult`), and helpers (`ListQuery`,
`PaginationMeta`).

### `src/scripts/`

Standalone CLI scripts run with `tsx`, e.g. `seed.ts` (creates the first admin).

---

## Naming conventions

| Thing                     | Convention       | Example                               |
| ------------------------- | ---------------- | ------------------------------------- |
| Files & folders           | camelCase        | `jobService.ts`, `customerModel.ts`   |
| Next.js reserved files    | framework casing | `page.tsx`, `route.ts`, `layout.tsx`  |
| Route group folders       | `(group)`        | `(admin)`, `(technician)`             |
| Variables / functions     | camelCase        | `parseListQuery`                      |
| React components (export) | PascalCase       | `export function Sidebar()`           |
| Types / interfaces        | PascalCase       | `interface JobDocument`               |
| Constants objects         | camelCase        | `jobStatus`, `roles`                  |
| Import alias              | `@/` → `src/`    | `import { roles } from "@/constants"` |

---

## Where do I put…?

| I'm adding…                  | It goes in…                                  |
| ---------------------------- | -------------------------------------------- |
| A new DB collection          | `models/` (+ `Document` interface + indexes) |
| Validation for an input      | `schemas/`                                   |
| Business logic / a DB query  | `services/`                                  |
| A REST endpoint              | `app/api/<resource>/route.ts`                |
| An admin screen              | `app/(admin)/<feature>/page.tsx`             |
| A technician screen          | `app/(technician)/...`                       |
| A reusable button/field      | `components/ui/`                             |
| A cross-cutting helper       | `lib/`                                       |
| A shared enum / string union | `constants/`                                 |
| A shared type                | `types/`                                     |
| Global client state          | `store/`                                     |

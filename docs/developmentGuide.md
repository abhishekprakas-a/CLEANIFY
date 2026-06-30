# Development Guide

How to set up, run, and extend the Water Tank Cleaning Service Management System.

---

## 1. Prerequisites

| Tool           | Version                                        |
| -------------- | ---------------------------------------------- |
| Node.js        | ≥ 20 (tested on 22)                            |
| npm            | ≥ 10                                           |
| MongoDB        | ≥ 6 (local or Atlas)                           |
| Object storage | Cloudflare R2 account + bucket (S3-compatible) |

---

## 2. First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env          # then edit values

# 3. Seed the first admin account
npm run seed

# 4. Start the dev server
npm run dev                   # http://localhost:3000
```

Log in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`.

---

## 3. Environment variables

See [`.env.example`](../.env.example) for the full list. Required at boot:

| Variable           | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `MONGODB_URI`      | Mongoose connection string                                 |
| `JWT_SECRET`       | Signs/verifies session JWTs (use a long random value)      |
| `AUTH_COOKIE_NAME` | Session cookie name                                        |
| `R2_*`             | Account id, bucket, credentials, endpoint, public base URL |

`lib/env.ts` validates these at startup and throws a clear error if any are missing,
so misconfiguration fails fast instead of at first request.

---

## 4. Scripts

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start Next.js dev server (PWA disabled in dev) |
| `npm run build`        | Production build (generates service worker)    |
| `npm run start`        | Run the production build                       |
| `npm run lint`         | ESLint (next/core-web-vitals)                  |
| `npm run lint:fix`     | ESLint with autofix                            |
| `npm run format`       | Prettier — write all files                     |
| `npm run format:check` | Prettier — verify formatting (CI gate)         |
| `npm run typecheck`    | `tsc --noEmit`                                 |
| `npm run seed`         | Create/refresh the initial admin user          |

---

## 5. Naming & code conventions

- **camelCase** for files, folders, variables, functions, services, models, schemas,
  and exported component names (`bookingService.ts`, `customerModel.ts`,
  `CustomerTable` export in `customerTable.tsx`).
- Next.js reserved files keep framework casing: `page.tsx`, `layout.tsx`, `route.ts`,
  `loading.tsx`, `error.tsx`, `not-found.tsx`, `middleware.ts`.
- Import via the `@/` alias → `src/` (e.g. `import { roles } from "@/constants/roles"`).
- One responsibility per file; co-locate a feature's UI under its route group.
- Never put business logic in components — call a service through an action/route.

---

## 6. Layered architecture recap

```
app (UI/routes) ─▶ services ─▶ models / lib
        ▲              │
   schemas (Zod) ──────┘ (validation shared by both)
```

- Add business logic in `services/`, not in route handlers or components.
- `models/` and `services/` are **server-only** — never import them into a client
  component (they'd pull Mongoose into the browser bundle).
- Shared types live in `types/`; shared enums/maps in `constants/`.

---

## 7. How to add a new feature (recipe)

Example: add a "complaints" module.

1. **Type** — `src/types/complaint.ts` (`Complaint`, `ComplaintStatus`).
2. **Constants** — add any enum to `src/constants/` (reuse, don't inline strings).
3. **Model** — `src/models/complaintModel.ts` (schema + indexes + `models.X || model(...)`).
4. **Schema** — `src/schemas/complaintSchema.ts` (Zod create/update).
5. **Service** — `src/services/complaintService.ts` (all logic; throws `ApiError`).
6. **API** — `src/app/api/complaints/route.ts` (+ `[id]/route.ts`) using `handleRoute`
   - `requireRole`.
7. **UI** — route under the correct group: `src/app/(admin)/complaints/page.tsx`,
   reusing `components/ui/*` and `components/tables/*`.
8. **Wire nav** — add to `constants/routes.ts` and the sidebar.

Every model already follows the hot-reload-safe pattern:

```ts
export const complaintModel =
  (mongoose.models.Complaint as Model<Complaint>) ||
  mongoose.model<Complaint>("Complaint", complaintSchema);
```

---

## 8. Database connection (serverless-safe)

`lib/dbConnect.ts` caches the connection on `globalThis` so hot reloads and
serverless invocations reuse a single pooled connection instead of opening a new
one per request. **Always** `await dbConnect()` at the top of a service entry point
(or once per request) before touching a model.

---

## 9. Authentication during development

- Login sets an httpOnly cookie; you won't see the token in JS (by design).
- To test a technician flow, create a technician via `POST /api/users` (as admin),
  then log in as that user in a separate browser/profile.
- `middleware.ts` redirects unauthenticated page requests to `/login` and returns
  `401` for API requests.

---

## 10. File uploads in development

- Point `R2_*` at a Cloudflare **R2 bucket** (create one + an R2 API token in the
  Cloudflare dashboard). A local **MinIO** also works by overriding `R2_ENDPOINT`.
- The browser uploads **directly** to R2 via a presigned URL; in the bucket's
  **CORS policy**, allow `PUT` from `http://localhost:3000`.
- Enable the bucket's **r2.dev** public dev domain (or attach a custom domain) and
  put it in `R2_PUBLIC_BASE_URL` so the saved `url`s resolve.

---

## 11. PWA notes

- The service worker is **disabled in dev** (`next-pwa` `disable` flag) — test PWA
  behaviour with `npm run build && npm run start`.
- Update app metadata/icons in `src/app/manifest.ts` and `public/icons/`.
- The technician app is installable ("Add to Home Screen") on mobile.

---

## 12. Testing & quality gates (recommended)

- Run `npm run typecheck && npm run lint` before every commit.
- Unit-test services in isolation (they have no React/Next dependency).
- For the job state machine, table-test every entry in `jobTransitions`.

---

## 13. Deployment outline

1. Provision MongoDB Atlas + a Cloudflare R2 bucket (with CORS for your domain).
2. Set all env vars in the host (Vercel / container platform).
3. `npm run build` → deploy. The app tier is stateless and scales horizontally.
4. Run `npm run seed` once against production to create the first admin, then
   rotate that password immediately.

---

## 14. Reference docs

- [`projectArchitecture.md`](./projectArchitecture.md) — system design & layers
- [`folderStructure.md`](./folderStructure.md) — folder-by-folder guide & naming
- [`databaseSchema.md`](./databaseSchema.md) — models & indexes
- [`apiArchitecture.md`](./apiArchitecture.md) — endpoints & patterns
- [`authenticationFlow.md`](./authenticationFlow.md) — auth, tokens, RBAC, sessions
- [`attendanceWorkflow.md`](./attendanceWorkflow.md) — attendance status & reports
- [`customerModule.md`](./customerModule.md) — customer CRUD, search & history
- [`bookingWorkflow.md`](./bookingWorkflow.md) — booking lifecycle & operations
- [`schedulingArchitecture.md`](./schedulingArchitecture.md) — assignment & calendar
- [`jobWorkflow.md`](./jobWorkflow.md) — job state machine & photo gates
- [`pwa.md`](./pwa.md) — technician PWA: offline, sync, push, install
- [`photoArchitecture.md`](./photoArchitecture.md) — photo upload & approval
- [`reviewModule.md`](./reviewModule.md) — reviews, ratings & satisfaction metrics
- [`dashboard.md`](./dashboard.md) — admin & technician dashboards
- [`reports.md`](./reports.md) — reports, filters & CSV/Excel/PDF export
- [`deployment.md`](./deployment.md) — deploy, Docker/Vercel, hardening
- [`envGuide.md`](./envGuide.md) — environment variables
- [`productionChecklist.md`](./productionChecklist.md) — pre-launch checklist

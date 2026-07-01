# Water Tank Cleaning Service Management System

A production-ready full-stack application for running a water-tank cleaning
business: customer intake, bookings, scheduling, a field-technician PWA,
before/after photo approval, reviews, dashboards, and reports.

Built with **Next.js (App Router) + TypeScript**, **MongoDB/Mongoose**, **JWT auth**,
**Cloudflare R2 storage** (S3-compatible), **Zustand**, **Zod + React Hook Form**, **next-pwa**,
**Recharts**, and **TanStack Table**.

## Roles

- **Admin / Calling Staff** — customers, bookings, scheduling, approvals, reviews, reports.
- **Technician** — installable PWA for attendance, assigned jobs, status updates, photo upload.

## Quick start

```bash
npm install
cp .env.example .env     # edit values
npm run seed             # create the first admin
npm run dev              # http://localhost:3000
```

## Documentation

Full architecture and reference docs live in [`docs/`](./docs):

| Doc                                                           | What it covers                                         |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| [featureCapabilities.md](./docs/featureCapabilities.md)       | **What the app can do today** — full catalogue         |
| [jobManagementChangelog.md](./docs/jobManagementChangelog.md) | **What changed** — multi-worker, Job Card, multi-tank  |
| [testResults.md](./docs/testResults.md)                       | **Test results** — API + UI click-through (2026-07-01) |
| [projectArchitecture.md](./docs/projectArchitecture.md)       | System design, layers, request lifecycle               |
| [folderStructure.md](./docs/folderStructure.md)               | Every folder, what belongs in it, naming rules         |
| [databaseSchema.md](./docs/databaseSchema.md)                 | MongoDB models, relationships, indexes                 |
| [apiArchitecture.md](./docs/apiArchitecture.md)               | Endpoints, patterns, security                          |
| [authenticationFlow.md](./docs/authenticationFlow.md)         | Auth, JWT/refresh tokens, RBAC, sessions               |
| [attendanceWorkflow.md](./docs/attendanceWorkflow.md)         | Check-in/out, status rules, attendance reports         |
| [customerModule.md](./docs/customerModule.md)                 | Customer CRUD, search, history, delete rules           |
| [bookingWorkflow.md](./docs/bookingWorkflow.md)               | Booking lifecycle, reschedule/cancel, history          |
| [schedulingArchitecture.md](./docs/schedulingArchitecture.md) | Assignment, conflicts, availability, calendar          |
| [jobWorkflow.md](./docs/jobWorkflow.md)                       | Job state machine & photo approval gates               |
| [pwa.md](./docs/pwa.md)                                       | Technician PWA: offline, sync, push, install           |
| [photoArchitecture.md](./docs/photoArchitecture.md)           | Photo upload pipeline, approval, review panel          |
| [reviewModule.md](./docs/reviewModule.md)                     | Reviews, ratings, satisfaction metrics                 |
| [dashboard.md](./docs/dashboard.md)                           | Admin & technician dashboards, charts, queries         |
| [reports.md](./docs/reports.md)                               | Reports, filters, CSV/Excel/PDF export                 |
| [deployment.md](./docs/deployment.md)                         | Build, Docker/Vercel, hardening, health                |
| [envGuide.md](./docs/envGuide.md)                             | Every environment variable                             |
| [productionChecklist.md](./docs/productionChecklist.md)       | Pre-launch checklist                                   |
| [developmentGuide.md](./docs/developmentGuide.md)             | Setup, conventions, how to extend                      |

## Project layout

```
src/
  app/          App Router routes + REST API (route handlers)
  components/   Reusable UI (ui/, layout/, auth/, technician/)
  services/     Business logic (auth, customer, booking, job, …)
  schemas/      Zod validation (shared client + server)
  models/       Mongoose models
  lib/          Infra: db, jwt, storage (R2), auth guard, http helpers
  store/        Zustand stores
  hooks/        Client hooks
  constants/    Enums, roles, routes, job state machine
  types/        Shared TypeScript types
  scripts/      seed.ts
```

## Scripts

| Command                      | Description              |
| ---------------------------- | ------------------------ |
| `npm run dev`                | Dev server               |
| `npm run build` / `start`    | Production build / run   |
| `npm run lint` / `typecheck` | Quality gates            |
| `npm run seed`               | Create the initial admin |

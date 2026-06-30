# Job Workflow

> The job is the heart of the system. Its lifecycle is an explicit **state
> machine** so every transition is validated, audited, and role-gated. The
> machine is defined in `src/constants/jobStatus.ts` and enforced through
> `lib/jobWorkflow.applyJobTransition()`, used by `jobService` (technician
> execution edges), `photoService` (approval edges) and `schedulingService`
> (scheduling edges). Scheduling/assignment detail lives in
> [`schedulingArchitecture.md`](./schedulingArchitecture.md).

---

## 1. States

| State                        | Meaning                                         | Driven by                   |
| ---------------------------- | ----------------------------------------------- | --------------------------- |
| `pending`                    | Job created from a booking; not scheduled       | system/admin                |
| `scheduled`                  | Date/time set                                   | admin (scheduling)          |
| `assigned`                   | Technician assigned                             | admin (scheduling)          |
| `reachedSite`                | Technician has arrived on site                  | technician                  |
| `beforePhotoPendingApproval` | Before photos uploaded, awaiting admin approval | technician → admin          |
| `cleaningInProgress`         | Before photos approved; cleaning underway       | admin approves → technician |
| `afterPhotoPendingApproval`  | After photos uploaded, awaiting admin approval  | technician → admin          |
| `completed`                  | After photos approved; job done (terminal)      | admin                       |
| `cancelled`                  | Cancelled (terminal)                            | admin                       |

---

## 2. State diagram

```
 pending ──schedule──▶ scheduled ──assign──▶ assigned
                                                │ reach site (technician, checked-in)
                                                ▼
                                         reachedSite ◀───────────────┐
                                                │ upload before photos │ reject before
                                                ▼                      │ (admin)
                              beforePhotoPendingApproval ──────────────┘
                                                │ approve before (admin)
                                                ▼
                                       cleaningInProgress ◀────────────┐
                                                │ upload after photos    │ reject after
                                                ▼                        │ (admin)
                              afterPhotoPendingApproval ─────────────────┘
                                                │ approve after (admin)
                                                ▼
                                           completed   (terminal)

   any non-terminal ──cancel (admin)──▶ cancelled   (terminal)
```

---

## 3. Transition table

| From                         | To                           | Trigger / API                                    | Role       | Guards                                    |
| ---------------------------- | ---------------------------- | ------------------------------------------------ | ---------- | ----------------------------------------- |
| `pending`                    | `scheduled`                  | `PATCH /jobs/:id/assign` or create-with-date     | admin      | date set                                  |
| `scheduled`                  | `assigned`                   | `PATCH /jobs/:id/assign`                         | admin      | technician active, no conflict, under cap |
| `assigned`                   | `reachedSite`                | `POST /jobs/:id/transition`                      | technician | assigned tech + checked in today          |
| `reachedSite`                | `beforePhotoPendingApproval` | transition                                       | technician | ≥1 before photo uploaded                  |
| `beforePhotoPendingApproval` | `cleaningInProgress`         | `POST /photos/:id/approve` (all before approved) | admin      | every before photo approved               |
| `beforePhotoPendingApproval` | `reachedSite`                | `POST /photos/:id/reject`                        | admin      | rejection reason given                    |
| `cleaningInProgress`         | `afterPhotoPendingApproval`  | transition                                       | technician | ≥1 after photo uploaded                   |
| `afterPhotoPendingApproval`  | `completed`                  | `POST /photos/:id/approve` (all after approved)  | admin      | every after photo approved                |
| `afterPhotoPendingApproval`  | `cleaningInProgress`         | `POST /photos/:id/reject`                        | admin      | rejection reason given                    |
| any non-terminal             | `cancelled`                  | `POST /jobs/:id/cancel`                          | admin      | reason given                              |

Any transition not in `jobTransitions` is rejected with `409 INVALID_TRANSITION`.

---

## 4. Enforcement

```ts
// constants/jobStatus.ts (shape)
export const jobTransitions: Record<JobStatus, JobStatus[]> = {
  pending: ["scheduled", "cancelled"],
  scheduled: ["assigned", "cancelled"],
  assigned: ["reachedSite", "cancelled"],
  reachedSite: ["beforePhotoPendingApproval", "cancelled"],
  beforePhotoPendingApproval: ["cleaningInProgress", "reachedSite"],
  cleaningInProgress: ["afterPhotoPendingApproval", "cancelled"],
  afterPhotoPendingApproval: ["completed", "cleaningInProgress"],
  completed: [],
  cancelled: [],
};
```

- `applyJobTransition(job, next, byUserId, note?)` validates the **edge** against
  this table, sets the status, appends to `statusHistory`, and stamps
  `startedAt` (→ `cleaningInProgress`) / `completedAt` (→ `completed`).
- **Generic transition endpoint** (`/jobs/:id/transition`) additionally checks
  `jobTransitionRoles[next]` and technician guards (assignment, check-in, photo
  counts). It handles the technician forward edges.
- **Approval edges** are applied inside `photoService` (the admin acts through the
  photo approve/reject endpoints), which calls `applyJobTransition` directly —
  this is why before-reject can target `reachedSite` (a technician-owned state)
  without tripping the role map.

---

## 5. Photo approval gates

The before/after photo sets are **two independent approval gates**:

| Gate   | Submit (technician)                              | All approved (admin)   | Any rejected (admin)            |
| ------ | ------------------------------------------------ | ---------------------- | ------------------------------- |
| Before | `reachedSite → beforePhotoPendingApproval`       | → `cleaningInProgress` | → `reachedSite` (retake)        |
| After  | `cleaningInProgress → afterPhotoPendingApproval` | → `completed`          | → `cleaningInProgress` (retake) |

`photoService.advanceGate(jobId, kind)` advances the job only when **every** photo
of that kind is approved.

---

## 6. End-to-end happy path

1. **Calling staff** create a **customer** and a **booking**.
2. **Admin** creates a **job** from the booking and uses the **schedule** to set a
   date and **assign** a technician → `pending → scheduled → assigned`
   (availability + conflict checked). Booking becomes `scheduled`.
3. **Technician** (PWA) checks in, opens the assigned job, marks `reachedSite`.
4. Technician uploads **before** photos → `beforePhotoPendingApproval`.
5. **Admin** approves the before photos → `cleaningInProgress`.
6. Technician cleans, uploads **after** photos → `afterPhotoPendingApproval`,
   adding completion notes.
7. **Admin** approves the after photos → `completed`.
8. **Calling staff** record a **review**; the job feeds dashboards and reports.

---

## 7. Side effects per transition

| Transition             | Side effects                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| → `scheduled`          | Booking → `scheduled`; appears on the calendar                       |
| → `assigned`           | `jobAssignment` (active) created; appears in technician's queue      |
| → `cleaningInProgress` | `startedAt = now`                                                    |
| → `completed`          | `completedAt = now`; eligible for review; counts toward KPIs/revenue |
| reject (before/after)  | Photo marked `rejected`; job returns to the previous working state   |
| → `cancelled`          | Excluded from completion KPIs and the calendar                       |

---

## 8. Technician execution UI

The technician opens an assigned job at `/technician/jobs/:id`
([`JobDetail`](../src/components/technician/jobDetail.tsx)). The screen is
**state-driven** — only the action valid for the current status is shown, so steps
cannot be skipped from the UI, and the server rejects any skip with
`409 INVALID_TRANSITION` regardless.

| Status                       | Technician sees                                             | Action → transition                 |
| ---------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `assigned`                   | Customer + **Open in Maps**; "I've reached the site"        | → `reachedSite` (requires check-in) |
| `reachedSite`                | **Before** photo uploader; submit when ≥1                   | → `beforePhotoPendingApproval`      |
| `beforePhotoPendingApproval` | "Awaiting approval" (read-only photos)                      | — (admin approves)                  |
| `cleaningInProgress`         | **After** photo uploader + completion notes; submit when ≥1 | → `afterPhotoPendingApproval`       |
| `afterPhotoPendingApproval`  | "Awaiting final approval"                                   | — (admin approves → `completed`)    |
| `completed` / `cancelled`    | Terminal message                                            | —                                   |

- **Maps:** the job's customer is opened via `googleMapLocation` if present, else a
  Google Maps search of the address.
- **Photos:** uploaded directly to R2 (presign → PUT → confirm); see
  [`pwa.md`](./pwa.md) / [`projectArchitecture.md`](./projectArchitecture.md) §8.
- **Check-in guard:** `assigned → reachedSite` requires the technician to have
  checked in today (see [`attendanceWorkflow.md`](./attendanceWorkflow.md)).

---

## 9. Activity timeline & audit

Every transition appends an immutable entry to `jobModel.statusHistory`:
`{ status, at, by, note }`. This is the job's **audit log** — who did what, when,
and why (rejection reasons, cancellation reasons, reassignment notes are stored as
the `note`).

`GET /api/jobs/:id/timeline` (`jobService.timeline`) returns these events with the
actor's **name resolved**, rendered as a vertical
[`JobTimeline`](../src/components/technician/jobTimeline.tsx) on the job detail
screen. Because the history is append-only and every state change flows through
`applyJobTransition`, the timeline is a complete, tamper-evident record of the
job's lifecycle.

# Work Scheduling Architecture

> How jobs are scheduled and dispatched: a dedicated `jobAssignment` record per
> technician↔job, conflict detection, availability/capacity validation,
> rescheduling, and daily / weekly / monthly calendar views for admins.

---

## 1. Models

### jobModel (scheduling-relevant fields)

| Field                | Type                 | Notes                                    |
| -------------------- | -------------------- | ---------------------------------------- |
| `assignedTechnician` | ObjectId → userModel | Current technician (denormalised)        |
| `scheduledDate`      | Date                 | Service date                             |
| `scheduledTime`      | String               | `HH:mm` (optional)                       |
| `status`             | String enum          | See [`jobWorkflow.md`](./jobWorkflow.md) |

Indexes: `{ assignedTechnician, status }`, `{ assignedTechnician, scheduledDate }`,
`{ scheduledDate }`.

### jobAssignmentModel (one row per assignment)

| Field           | Type                 | Notes                                   |
| --------------- | -------------------- | --------------------------------------- |
| `job`           | ObjectId → jobModel  |                                         |
| `technician`    | ObjectId → userModel |                                         |
| `assignedBy`    | ObjectId → userModel | Admin who assigned                      |
| `assignedAt`    | Date                 |                                         |
| `scheduledDate` | Date                 | Snapshot at assignment                  |
| `scheduledTime` | String               | `HH:mm`                                 |
| `status`        | String enum          | `active` \| `reassigned` \| `cancelled` |
| `note`          | String               | e.g. reassignment reason                |

Reassigning marks the current `active` row `reassigned` and creates a new `active`
row, so a job's **full assignment history** is preserved. Indexes:
`{ job, status }`, `{ technician, scheduledDate, status }`.

---

## 2. Scheduling operations (`schedulingService`)

| Operation                                                         | Effect                                                                                                          | Status change                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `assign(jobId, { technicianId, scheduledDate?, scheduledTime? })` | Validate availability + conflict; set technician + schedule; create active assignment; mark booking `scheduled` | `pending`→`scheduled`→`assigned` |
| `reassign(jobId, { technicianId, note? })`                        | Only while `assigned`; deactivate old assignment, create new; conflict-checked                                  | stays `assigned`                 |
| `reschedule(jobId, { scheduledDate, scheduledTime?, note? })`     | Change date/time (re-validates conflict for the assigned tech); updates active assignment                       | unchanged                        |

All three append to the job's `statusHistory` audit trail. Terminal jobs
(`completed`, `cancelled`) reject these operations.

### Conflict detection

`findConflict(technicianId, date, time, excludeJobId?)` finds another
**non-terminal** job for the same technician on the **same day**, and — when
`schedulingPolicy.blockSameSlot` is true — the **same `scheduledTime`**. A match
throws `409 CONFLICT` naming the clashing job.

### Availability / capacity validation

`assertTechnicianAvailable()` enforces:

1. The technician is **active** (role `technician`, status `active`).
2. No scheduling **conflict** (above).
3. The technician is under the **daily cap** (`schedulingPolicy.maxJobsPerDay`,
   default 5) — else `422 UNPROCESSABLE`.

`availability(technicianId, date)` returns the technician's jobs that day plus
`{ jobCount, maxJobsPerDay, isAvailable }` for the assignment UI.

> Policy lives in [`src/constants/scheduling.ts`](../src/constants/scheduling.ts).

---

## 3. Calendar views

`getSchedule(view, date, technicianId?)` dispatches:

| View      | Range                             | Returns                          |
| --------- | --------------------------------- | -------------------------------- |
| `daily`   | the given day                     | `DaySchedule` `{ date, jobs[] }` |
| `weekly`  | Monday–Sunday containing the date | `DaySchedule[]` (7)              |
| `monthly` | 1st–last of the date's month      | `DaySchedule[]` (one per day)    |

Each job is projected to a lightweight `ScheduledJob`
(`{ id, jobCode, status, scheduledDate, scheduledTime, customer, assignedTechnician }`).
Cancelled jobs are excluded from the calendar.

---

## 4. API

| Method | Path                                             | Permission    | Purpose                                  |
| ------ | ------------------------------------------------ | ------------- | ---------------------------------------- |
| GET    | `/api/schedule?view=&date=&technicianId=`        | `jobs:read`   | Daily / weekly / monthly schedule        |
| GET    | `/api/schedule/availability?technicianId=&date=` | `jobs:assign` | A technician's load + availability       |
| PATCH  | `/api/jobs/:id/assign`                           | `jobs:assign` | Assign technician (+ optional date/time) |
| POST   | `/api/jobs/:id/reassign`                         | `jobs:assign` | Move to a different technician           |
| POST   | `/api/jobs/:id/reschedule`                       | `jobs:assign` | Change date/time                         |
| POST   | `/api/jobs`                                      | `jobs:write`  | Create a job from a booking (`pending`)  |

Validation: `scheduleQuerySchema`, `availabilityQuerySchema`, `assignJobSchema`,
`reassignJobSchema`, `rescheduleJobSchema` in `src/schemas/jobSchema.ts`.

---

## 5. Admin UI

`/schedule` renders [`SchedulingCalendar`](../src/components/scheduling/schedulingCalendar.tsx):

- **Month / Week / Day** toggle with prev / today / next navigation.
- **Month** — a 6×7 grid; each day shows up to three job chips; clicking a day
  drills into the day view.
- **Week** — seven day columns with job chips.
- **Day** — a list of jobs; each row has a technician selector (Assign /
  Reassign) and a Reschedule action.

The technician selector is populated from `/api/users?role=technician`.

---

## 6. State machine integration

Scheduling drives the **front half** of the job lifecycle
(`pending → scheduled → assigned`); the **execution half**
(`reachedSite → … → completed`) is the technician/photo workflow in
[`jobWorkflow.md`](./jobWorkflow.md). Both share one enforcement point —
`lib/jobWorkflow.applyJobTransition()` — so no path can corrupt the lifecycle.

---

## 7. Notes & future work

- **Conflict granularity:** conflicts are day + exact-time. For duration-aware
  overlap, add a `durationMinutes` to the job and compare intervals.
- **Working calendar:** the daily cap does not yet account for weekends/holidays
  or technician leave — extend `assertTechnicianAvailable` when needed.
- **Reassign window:** reassignment is allowed only while `assigned` (before the
  technician reaches site); relax in `schedulingService.reassign` if required.
- **UI actions** use lightweight prompts for reschedule; swap for a modal for
  richer validation.

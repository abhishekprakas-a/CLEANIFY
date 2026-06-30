# Dashboards

> Role-specific dashboards backed by optimized aggregate queries. The **admin**
> dashboard summarises the whole operation with KPIs, attendance, approvals,
> reviews, and analytics charts; the **technician** dashboard focuses on their own
> day. Both are served by `dashboardService` (one round trip each).

---

## 1. Admin dashboard (`/dashboard`)

`dashboardService.adminSummary()` → `AdminDashboard`:

| Section             | Content                                                                                             | Source                             |
| ------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------- |
| KPIs                | `todaysJobs`, `pendingJobs`, `completedJobs`, `pendingApprovals`, `totalCustomers`, `averageRating` | `countDocuments` + a review `$avg` |
| Attendance summary  | present / late / halfDay / absent / total for today                                                 | `attendanceService.dailyReport`    |
| Jobs by status      | count per status (bar)                                                                              | `$group` on `status`               |
| Jobs trend          | jobs created per day, last 7 days (line)                                                            | `$group` on `createdAt`            |
| Rating distribution | count per star 1–5 (bar)                                                                            | `$group` on `starRating`           |
| Recent reviews      | latest 5 with customer, rating, technician, date (table)                                            | `find().limit(5)` populated        |

Definitions:

- **todaysJobs** — jobs scheduled today (excluding cancelled).
- **pendingJobs** — jobs in any non-terminal status (`$nin [completed, cancelled]`).
- **completedJobs** — total completed.
- **pendingApprovals** — jobs in `beforePhotoPendingApproval` / `afterPhotoPendingApproval`.

The page is a **Server Component** that calls the service directly and passes the
data to a client view; the charts ([Recharts](https://recharts.org)) render in
[`AdminDashboardView`](../src/components/dashboard/adminDashboardView.tsx) +
[`dashboardCharts`](../src/components/dashboard/dashboardCharts.tsx).

---

## 2. Technician dashboard (`/technician`)

`dashboardService.technicianSummary(user)` → `TechnicianDashboardData`:

| Section           | Content                                                        |
| ----------------- | -------------------------------------------------------------- |
| Counts            | `assignedActive`, `today`, `completed`                         |
| Attendance status | today's record (offline-aware check-in/out card)               |
| Today's schedule  | the technician's jobs scheduled today (time, customer, status) |
| Job progress      | their active jobs grouped by status (progress bars)            |
| My jobs           | full assigned list (offline-cached via `useAssignedJobs`)      |

Rendered by [`TechnicianDashboard`](../src/components/technician/technicianDashboard.tsx).
The attendance card and the cached job list keep working offline (see
[`pwa.md`](./pwa.md)); the summary counts/schedule come from the API when online.

---

## 3. API

| Method | Path                        | R   | Purpose                      |
| ------ | --------------------------- | --- | ---------------------------- |
| GET    | `/api/dashboard/summary`    | A   | Admin dashboard payload      |
| GET    | `/api/dashboard/technician` | T   | Technician dashboard payload |

The admin page renders server-side (no client fetch); the endpoint exists for
client use/refresh. The technician dashboard fetches its endpoint client-side.

---

## 4. Query optimization

- Every dashboard issues its reads in a single **`Promise.all`** — counts,
  aggregates, and lists run concurrently.
- **`countDocuments`** (not `find().length`) for KPI counts.
- Aggregations use indexed fields (`status`, `scheduledDate`, `createdAt`,
  `starRating`); see [`databaseSchema.md`](./databaseSchema.md).
- Lists are bounded (recent reviews `limit(5)`; technician schedule is one day).
- Per-technician grouping is done with a small `find().select("status")` + in-memory
  tally to avoid `$match` ObjectId-casting pitfalls.

---

## 5. Notes & future work

- **Caching:** `force-dynamic` keeps the admin page fresh on each load; add a short
  revalidate or a cached layer if read volume grows.
- **Date range:** metrics are today / last-7-days / all-time. A range picker +
  the [reports module](./apiArchitecture.md) would cover periodic reporting.
- **Revenue:** `reportService.revenue` exists; add a revenue chart once
  `priceFinal` is consistently captured on jobs.

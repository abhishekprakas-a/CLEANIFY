# Reports

> Five admin reports — attendance, job completion, technician performance,
> customer reviews, and monthly productivity — with date/technician/status
> filtering, charts + tables, and export to CSV, Excel, and PDF.

---

## 1. Uniform report shape

Every report endpoint returns the same `ReportPayload`, so **one UI and one export
path** render them all:

```ts
interface ReportPayload {
  title: string;
  generatedAt: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
  summary: { label: string; value: string | number }[]; // summary cards
  chart?: { type: "bar" | "line"; dataLabel: string; data: { label; value }[] };
}
```

The UI ([`ReportsDashboard`](../src/components/reports/reportsDashboard.tsx)) renders
the summary cards, the chart ([`ReportChart`](../src/components/reports/reportChart.tsx)),
the table, and the export buttons generically from this shape.

---

## 2. The reports (`reportService`)

| Report                 | Method                  | Rows                                                      | Chart                           | Key summary                                      |
| ---------------------- | ----------------------- | --------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| Attendance             | `attendance`            | technician, date, in/out, hours, status                   | status breakdown (bar)          | records, present/late/half, total hours          |
| Job completion         | `jobCompletion`         | job, customer, technician, dates, status                  | jobs by status (bar)            | total, completed, **completion rate**, cancelled |
| Technician performance | `technicianPerformance` | per-tech: jobs, avg rating, reviews, days, hours          | jobs done per tech (bar)        | technicians, jobs completed, top performer       |
| Customer reviews       | `customerReviews`       | customer, technician, rating, satisfaction, comment, date | rating distribution (bar)       | reviews, avg rating, satisfied %                 |
| Monthly productivity   | `monthlyProductivity`   | per-month: jobs, reviews, avg rating, hours               | jobs completed per month (line) | year, jobs completed, best month                 |

Performance and productivity combine **jobs + reviews + attendance** with parallel
aggregations (`Promise.all`).

---

## 3. Filtering

| Filter                      | Applies to                             | Notes                                                                                                           |
| --------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Date range (`from`,`to`)    | attendance, jobs, technicians, reviews | matched on the natural date field (attendance `date`, jobs `scheduledDate`/`completedAt`, reviews `reviewDate`) |
| Technician (`technicianId`) | attendance, jobs, reviews              |                                                                                                                 |
| Job status (`status`)       | job completion                         | any `jobStatus` value                                                                                           |
| Year (`year`)               | monthly productivity                   | defaults to the current year                                                                                    |

---

## 4. API

| Method | Path                                                | Permission     | Report                 |
| ------ | --------------------------------------------------- | -------------- | ---------------------- |
| GET    | `/api/reports/attendance?from=&to=&technicianId=`   | `reports:view` | Attendance             |
| GET    | `/api/reports/jobs?from=&to=&technicianId=&status=` | `reports:view` | Job completion         |
| GET    | `/api/reports/technicians?from=&to=`                | `reports:view` | Technician performance |
| GET    | `/api/reports/reviews?from=&to=&technicianId=`      | `reports:view` | Customer reviews       |
| GET    | `/api/reports/productivity?year=`                   | `reports:view` | Monthly productivity   |

---

## 5. Export (CSV / Excel / PDF)

[`ExportButtons`](../src/components/reports/exportButtons.tsx) exports the current
report's `columns` + `rows` client-side
([`lib/export/reportExport.ts`](../src/lib/export/reportExport.ts)):

| Format    | How                                                                                       |
| --------- | ----------------------------------------------------------------------------------------- |
| **CSV**   | Built in-browser (proper quoting), downloaded as a Blob — no dependency                   |
| **Excel** | [SheetJS `xlsx`](https://sheetjs.com) → real `.xlsx`                                      |
| **PDF**   | [`jspdf`](https://github.com/parallax/jsPDF) + `jspdf-autotable` → titled, tabular `.pdf` |

The export libraries are **lazy-loaded** (`await import(...)`) only when a button is
clicked, so they stay out of the main bundle. Export uses the data already loaded in
the UI — no extra server round trip.

---

## 6. Notes & future work

- **Large reports:** rows are returned in full (no pagination) since exports need
  the complete set. Add server-side streaming/pagination if a report can exceed a
  few thousand rows.
- **Scheduled reports:** the `/schedule` cloud-agent tooling could email a weekly
  CSV; not wired up here.
- **Revenue:** add a revenue report once `priceFinal` is consistently captured on
  jobs (the aggregation pattern mirrors productivity).

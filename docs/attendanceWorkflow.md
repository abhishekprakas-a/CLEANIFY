# Attendance Workflow

> Daily check-in / check-out for technicians with automatic status classification
> (`present` · `late` · `halfDay` · `absent`), plus daily / weekly / monthly
> reports for admins. One record per user per day, enforced by a unique index.

---

## 1. Data model (`attendanceModel`)

| Field          | Type                 | Notes                                             |
| -------------- | -------------------- | ------------------------------------------------- |
| `userId`       | ObjectId → userModel | The technician (or any user)                      |
| `date`         | String               | Local `YYYY-MM-DD` day key                        |
| `checkInTime`  | Date                 | Set on check-in                                   |
| `checkOutTime` | Date                 | Set on check-out                                  |
| `workingHours` | Number               | Decimal hours, computed on check-out              |
| `status`       | String enum          | `present` \| `late` \| `halfDay` (stored)         |
| `geoLocation`  | Object               | Optional `{ checkIn?, checkOut? }` `{ lat, lng }` |

**Unique index** `{ userId: 1, date: 1 }` — guarantees a single record per day and
backs the duplicate-check-in guard. Additional indexes on `{ date }` and
`{ status }` for reporting.

> `absent` is **never stored**. It is derived in reports as "an active technician
> with no record for that day".

---

## 2. Status policy

Tunable in [`src/constants/attendance.ts`](../src/constants/attendance.ts):

```ts
attendancePolicy = {
  shiftStartHour: 9,
  shiftStartMinute: 0, // shift starts 09:00
  lateGraceMinutes: 15, // late after 09:15
  halfDayHours: 4, // < 4h worked ⇒ halfDay
  fullDayHours: 8, // target full day (informational)
};
```

Classification rules:

| When             | Rule                                  | Result                             |
| ---------------- | ------------------------------------- | ---------------------------------- |
| Check-in         | check-in time ≤ `09:15`               | `present`                          |
| Check-in         | check-in time > `09:15`               | `late`                             |
| Check-out        | `workingHours < 4`                    | `halfDay` (overrides present/late) |
| Check-out        | `workingHours ≥ 4`                    | keeps `present` / `late`           |
| Report (derived) | active technician, no record that day | `absent`                           |

---

## 3. Check-in / check-out flow

```
Technician opens the PWA attendance screen
        │
        ▼
POST /api/attendance/checkIn { location? }
   guard: no existing record for (userId, today)  ── else 409 "already checked in"
   → store checkInTime, status = present|late, geoLocation.checkIn
        │
   …works the day…
        │
        ▼
POST /api/attendance/checkOut { location? }
   guard: record exists and checkOutTime not set   ── else 404 / 409
   → workingHours = (now − checkInTime) / 1h
   → status = halfDay if workingHours < 4, else unchanged
   → store checkOutTime, geoLocation.checkOut
```

The "currently checked in" state is **derived**: a record with a `checkInTime` and
no `checkOutTime`. There is no separate session flag.

The job workflow ties into this: a technician must be **checked in today** before a
job can move `scheduled → enRoute` (enforced in `jobService.transition`).

---

## 4. Reports

`attendanceService.getReport(period, date?, userId?)` dispatches by period:

### Daily (`period=daily`)

One row per active technician for the given date, including absentees:

```
{ date, counts: { present, late, halfDay, absent, total },
  rows: [{ userId, name, status, checkInTime, checkOutTime, workingHours }] }
```

### Weekly (`period=weekly`)

The Monday–Sunday week containing the anchor date. Per-technician aggregation.

### Monthly (`period=monthly`)

The 1st–last day of the anchor date's month. Per-technician aggregation.

Range reports return:

```
{ from, to, workingDays,
  counts: { present, late, halfDay, absent, total },
  rows: [{ userId, name, presentDays, lateDays, halfDays, absentDays, totalHours }] }
```

> `absentDays = workingDays − (presentDays + lateDays + halfDays)`. The current
> implementation counts **calendar days** in the range; weekends/holidays are not
> excluded — adjust `workingDays` in `rangeReport` if a working-calendar is needed.

---

## 5. API

| Method | Path                                           | Role       | Purpose                                            |
| ------ | ---------------------------------------------- | ---------- | -------------------------------------------------- |
| POST   | `/api/attendance/checkIn`                      | technician | Check in (optional geo); blocks duplicates         |
| POST   | `/api/attendance/checkOut`                     | technician | Check out; computes hours + final status           |
| GET    | `/api/attendance/today`                        | technician | Today's record (drives the widget)                 |
| GET    | `/api/attendance/history`                      | technician | Recent records for the current user                |
| GET    | `/api/attendance`                              | admin      | Paginated raw records (filter `userId`/date range) |
| GET    | `/api/attendance/report?period=&date=&userId=` | admin      | Daily / weekly / monthly report                    |

Validation via `attendanceSchema.ts` (`checkInSchema`, `checkOutSchema`,
`attendanceReportSchema`). The report endpoint is **admin-only** (technicians hold
`attendance:read` for their own data, not the org-wide roster).

---

## 6. UI

- **Technician** — [`/technician/attendance`](<../src/app/(technician)/technician/attendance/page.tsx>):
  the `AttendanceWidget` (check-in/out with geolocation + today's status) and
  `AttendanceHistory` (recent days).
- **Admin** — [`/attendance`](<../src/app/(admin)/attendance/page.tsx>): the
  `AttendanceDashboard` with a daily/weekly/monthly toggle, a date picker, summary
  cards (present/late/halfDay/absent), and a roster/summary table.

---

## 7. Edge cases & notes

- **Timezone:** day keys use the **server's local date**, not UTC, so late-night
  check-ins land on the right day. For multi-timezone deployments, pin the server
  timezone or pass an explicit offset.
- **No check-out:** a record with `checkInTime` but no `checkOutTime` keeps its
  check-in status and has no `workingHours`. A scheduled job could auto-close stale
  sessions at end of day (future enhancement).
- **Geo is optional:** capture fails silently if the browser denies permission;
  attendance still records.

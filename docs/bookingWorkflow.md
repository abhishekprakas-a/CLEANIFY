# Booking Workflow

> A booking is a customer's request to have tanks cleaned. It is captured by admin
> / calling staff, then scheduled into a [job](./jobWorkflow.md). Bookings support
> create, edit, reschedule, cancel, and a status-change history.

---

## 1. Data model (`bookingModel`)

| Field                   | Type                     | Required | Notes                                                      |
| ----------------------- | ------------------------ | -------- | ---------------------------------------------------------- |
| `customerId`            | ObjectId → customerModel | ✓        | Indexed                                                    |
| `tankType`              | String enum              | ✓        | `overhead` \| `underground` \| `sump` \| `loft` \| `other` |
| `tankCapacity`          | Number                   | ✓        | Litres (≥ 1)                                               |
| `numberOfTanks`         | Number                   | ✓        | ≥ 1                                                        |
| `scheduledDate`         | Date                     | ✓        | Requested service date                                     |
| `scheduledTime`         | String                   |          | `HH:mm` (optional)                                         |
| `specialInstructions`   | String                   |          | Free text                                                  |
| `bookingStatus`         | String enum              | ✓        | See §2; default `pending`                                  |
| `statusHistory`         | Array                    |          | `[{ status, at, by, note }]` audit trail                   |
| `cancellationReason`    | String                   |          | Set on cancel                                              |
| `createdBy`             | ObjectId → userModel     | ✓        | Staff who created it                                       |
| `createdAt`/`updatedAt` | Date                     | auto     | Timestamps                                                 |

**Indexes:** `{ customerId: 1 }`, `{ bookingStatus: 1 }`,
`{ bookingStatus: 1, scheduledDate: 1 }`, `{ createdAt: -1 }`.

---

## 2. Status lifecycle

```
            create
              │
              ▼
         ┌─────────┐   schedule a job    ┌───────────┐
         │ pending │────────────────────▶│ scheduled │
         └────┬────┘                     └─────┬─────┘
              │ reschedule                     │ reschedule
              ▼                                ▼
        ┌─────────────┐  ◀────────────────────┘
        │ rescheduled │
        └──────┬──────┘
               │ (job completes)
               ▼
          ┌───────────┐
          │ completed │   (terminal)
          └───────────┘

   any non-terminal  ──cancel──▶  ┌───────────┐
                                  │ cancelled │   (terminal)
                                  └───────────┘
```

| Status        | Meaning                                                           |
| ------------- | ----------------------------------------------------------------- |
| `pending`     | Created; not yet scheduled into a job                             |
| `scheduled`   | A job was created/assigned for this booking (set by `jobService`) |
| `rescheduled` | Date/time changed after creation                                  |
| `completed`   | The associated job finished (terminal)                            |
| `cancelled`   | Cancelled with a reason (terminal)                                |

**Terminal statuses** (`completed`, `cancelled`) cannot be edited, rescheduled, or
cancelled again — the service throws `409 CONFLICT`.

> The booking → `scheduled` transition is driven by the **scheduling/job** module:
> creating or assigning a job from a booking sets `bookingStatus = scheduled` (see
> [`jobWorkflow.md`](./jobWorkflow.md)).

---

## 3. Operations & validation

All inputs validated by `src/schemas/bookingSchema.ts` (shared client + server):

| Operation  | Schema                    | Effect                                                                     |
| ---------- | ------------------------- | -------------------------------------------------------------------------- |
| Create     | `createBookingSchema`     | status `pending`; first history entry                                      |
| Update     | `updateBookingSchema`     | edit details (not a status change); blocked if terminal                    |
| Reschedule | `rescheduleBookingSchema` | new `scheduledDate`/`scheduledTime`; status → `rescheduled`; history entry |
| Cancel     | `cancelBookingSchema`     | status → `cancelled` + `cancellationReason`; history entry                 |

`scheduledTime` must match `HH:mm`; `tankCapacity` and `numberOfTanks` are coerced
to positive integers. Create validates that the customer exists.

---

## 4. API

| Method | Path                                              | Permission       | Purpose                          |
| ------ | ------------------------------------------------- | ---------------- | -------------------------------- |
| GET    | `/api/bookings?page=&limit=&q=&status=&from=&to=` | `bookings:read`  | List: search + filter + paginate |
| POST   | `/api/bookings`                                   | `bookings:write` | Create                           |
| GET    | `/api/bookings/:id`                               | `bookings:read`  | Get one                          |
| PATCH  | `/api/bookings/:id`                               | `bookings:write` | Edit details                     |
| POST   | `/api/bookings/:id/reschedule`                    | `bookings:write` | Reschedule                       |
| POST   | `/api/bookings/:id/cancel`                        | `bookings:write` | Cancel                           |
| GET    | `/api/bookings/:id/history`                       | `bookings:read`  | Booking + status history         |

- **Search** (`q`) — matches customer name / mobile (resolved to customer ids).
- **Filter** — `status`, and a `scheduledDate` range via `from` / `to` (YYYY-MM-DD).
- **Pagination** — standard `meta` (`page, limit, total, totalPages`).
- **History** — the booking document carries `statusHistory`; the history endpoint
  returns the booking (with that trail) populated.

---

## 5. Admin UI

| Route           | Page             | What                                                                                            |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `/bookings`     | management table | `BookingTable` — search, status + date-range filters, pagination, reschedule/cancel row actions |
| `/bookings/new` | creation form    | `BookingForm` — customer selector + tank details + schedule                                     |

The creation form loads active customers into a selector. The table's reschedule /
cancel actions call the dedicated endpoints and refresh in place; terminal bookings
have those actions disabled.

---

## 6. Notes & future work

- **Booking → job:** scheduling lives in the job module; a booking becomes
  `scheduled` when its job is created. Wiring `completed` back onto the booking when
  its job finishes is a small follow-up (currently job completion is independent).
- **Reschedule/cancel UX:** the table uses lightweight prompts; swap for a modal
  form when richer validation/feedback is desired.
- **Cross-references:** customer history (`/api/customers/:id/history`) lists a
  customer's bookings via `customerId`.

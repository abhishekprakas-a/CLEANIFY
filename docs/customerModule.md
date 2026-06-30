# Customer Management Module

> Customer records captured by admin / calling staff: full CRUD, free-text search,
> status filtering, pagination, and a per-customer history of bookings and jobs.

---

## 1. Data model (`customerModel`)

| Field                   | Type                 | Required | Notes                                    |
| ----------------------- | -------------------- | -------- | ---------------------------------------- |
| `customerName`          | String               | ✓        | Trimmed                                  |
| `mobileNumber`          | String               | ✓        | Indexed; primary lookup key              |
| `address`               | String               | ✓        | Free-text (multi-line)                   |
| `googleMapLocation`     | String               |          | Google Maps URL (optional)               |
| `notes`                 | String               |          | Free-text                                |
| `status`                | String enum          | ✓        | `active` \| `inactive`; default `active` |
| `createdBy`             | ObjectId → userModel | ✓        | Staff who created the record             |
| `createdAt`/`updatedAt` | Date                 | auto     | Timestamps                               |

**Indexes:** `{ mobileNumber: 1 }`, `{ status: 1 }`, and a **text index** on
`{ customerName, mobileNumber, address }` for search.

> `status` is an addition beyond the requested fields — it powers soft-delete and
> the active/inactive filter (see §4).

---

## 2. Validation (Zod + React Hook Form)

`src/schemas/customerSchema.ts` is shared by the client form and the server:

- `createCustomerSchema` — `customerName` (≥2), `mobileNumber` (8–15 digits, regex),
  `address` (≥5), `googleMapLocation` (optional, must be a URL), `notes` (optional).
- `updateCustomerSchema` — all fields optional + `status`.
- `customerQuerySchema` — `q`, `status` for list queries.

The reusable [`CustomerForm`](../src/components/customers/customerForm.tsx) wires the
create schema into React Hook Form via `@hookform/resolvers/zod`, and is used for
**both** add and edit (it switches on a `customer` prop).

---

## 3. API

| Method | Path                                     | Permission        | Purpose                            |
| ------ | ---------------------------------------- | ----------------- | ---------------------------------- |
| GET    | `/api/customers?page=&limit=&q=&status=` | `customers:read`  | List: search + filter + paginate   |
| POST   | `/api/customers`                         | `customers:write` | Create                             |
| GET    | `/api/customers/:id`                     | `customers:read`  | Get one                            |
| PATCH  | `/api/customers/:id`                     | `customers:write` | Update                             |
| DELETE | `/api/customers/:id`                     | `customers:write` | Delete (soft — see §4)             |
| GET    | `/api/customers/:id/history`             | `customers:read`  | Customer + bookings + jobs + stats |

All responses use the standard envelope; list responses include `meta`
(`page, limit, total, totalPages`). Permission-gated via `requirePermission`.

### Search, filter, pagination

- **Search** (`q`) — case-insensitive regex across `customerName`, `mobileNumber`,
  and `address` (user input is regex-escaped).
- **Filter** (`status`) — `active` / `inactive`.
- **Pagination** — `parseListQuery` bounds `page`/`limit`; `meta` drives the UI pager.

### Customer history

`GET /api/customers/:id/history` returns:

```jsonc
{
  "customer": {
    /* Customer */
  },
  "bookings": [
    /* Booking[] newest first */
  ],
  "jobs": [
    /* Job[] newest first */
  ],
  "stats": { "totalBookings": 0, "totalJobs": 0, "completedJobs": 0 },
}
```

---

## 4. Delete semantics (soft delete)

Customers are referenced by bookings and jobs, so a hard delete would orphan
history. `customerService.remove()`:

- If the customer **has bookings** → set `status = inactive` (deactivate) and keep
  the record. Response: `{ deleted: false, deactivated: true }`.
- If the customer **has no bookings** → hard-delete the document. Response:
  `{ deleted: true, deactivated: false }`.

The admin table surfaces which happened in its confirmation message.

---

## 5. Admin UI

| Route                 | Page | What                                                                  |
| --------------------- | ---- | --------------------------------------------------------------------- |
| `/customers`          | list | `CustomerTable` — debounced search, status filter, pager, row actions |
| `/customers/new`      | add  | `CustomerForm` (create)                                               |
| `/customers/:id`      | view | Details + booking/job history + summary stats                         |
| `/customers/:id/edit` | edit | `CustomerForm` (edit)                                                 |

The list is a client component (interactive search/filter/paging via `api.list`);
the detail and edit pages are server components that call `customerService`
directly. The `googleMapLocation` renders as an "Open location" link.

---

## 6. Notes & future work

- **Duplicate guard:** creating a customer with an existing _active_ mobile number
  is rejected (`409`). Adjust in `customerService.create` if duplicates are allowed.
- **Reactivation:** a deactivated customer can be re-activated via
  `PATCH { status: "active" }` (no dedicated button yet).
- **Cross-references:** booking/job/review/report services populate the customer
  with `customerName mobileNumber` (and `address` where needed).

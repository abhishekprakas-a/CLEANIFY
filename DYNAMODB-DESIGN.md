# Cleanify — DynamoDB data model & migration plan

Moving from MongoDB/Mongoose to DynamoDB is a **persistence-layer rewrite**, not a
connection-string swap. This document defines the **partition key (PK) + sort key
(SK)** design and the **GSIs** for every access pattern the app uses today, plus
how to handle the things DynamoDB can't do natively (aggregations, joins, search,
skip-pagination). Current state: 13 Mongoose models, ~129 data-access calls across
14 services.

---

## 1. What actually changes (the honest list)

| MongoDB feature the app uses | DynamoDB reality | Solution |
|---|---|---|
| `.populate()` joins (customer, technicians on jobs) | No joins | **Denormalize** — copy `customerName`, tech names onto the item; or a second `Query`. |
| `.aggregate()` — KPIs, counts by status, rating distribution, 7-day trend, workload | No aggregations | **Maintained counter items** updated on write (or via DynamoDB Streams). |
| Regex search (customer name/mobile) | No substring search | Exact-match GSI on mobile; **OpenSearch/Algolia** for name contains (or prefix-only via `begins_with`). |
| `skip`/`limit` pagination | Offset paging not supported | **Cursor pagination** with `LastEvaluatedKey`. |
| Multikey index on `assignedTechnicians[]` | GSIs can't index a list | One **assignment item per (job, technician)** — that item carries the GSI keys. |
| `$in` / arbitrary filters | Only key conditions + filter-after-read | Model the access pattern into a GSI; `FilterExpression` only trims an already-read page. |
| Unique indexes (email, phone) | Enforced only via conditional writes | `attribute_not_exists(PK)` condition on insert + a uniqueness item. |

**Recommendation:** single-table design (one table, generic `PK`/`SK`, item `type`
attribute, shared GSIs). It's the idiomatic DynamoDB approach and keeps related
items co-located for cheap `Query`s.

---

## 2. Table

**Table `Cleanify`** — keys `PK` (S), `SK` (S). Global secondary indexes:

| Index | Purpose | Partition (PK) | Sort (SK) |
|---|---|---|---|
| **GSI1** | lookups / relations | `GSI1PK` | `GSI1SK` |
| **GSI2** | list-by-type + status | `GSI2PK` | `GSI2SK` |
| **GSI3** | by technician (jobs/assignments) | `GSI3PK` | `GSI3SK` |
| **GSI4** | by date (schedule, attendance, time-series) | `GSI4PK` | `GSI4SK` |

Billing: on-demand (PAY_PER_REQUEST) to start. Enable **DynamoDB Streams** (for the
counters). Add a **TTL** attribute (`expiresAt`) for sessions and (optionally)
audit logs.

---

## 3. Key schema per entity

Notation: `#` is a literal separator. `<x>` is a value.

### User
| Item | PK | SK | GSI1 (by email) | GSI2 (by role+status) |
|---|---|---|---|---|
| Profile | `USER#<id>` | `PROFILE` | `EMAIL#<email>` / `USER` | `ROLE#<role>` / `STATUS#<status>#<name>` |

- Login by email → GSI1. List active technicians / pending signups → GSI2
  (`Query ROLE#technician` + `begins_with(SK, "STATUS#active")`).

### Customer
| Item | PK | SK | GSI2 (list) |
|---|---|---|---|
| Profile | `CUST#<id>` | `PROFILE` | `CUSTOMERS` / `<status>#<createdAt>` |

- Mobile lookup: GSI1 `MOBILE#<mobile>` / `CUST`. Name search → OpenSearch (§5).

### Booking
| Item | PK | SK | GSI1 (by customer) | GSI2 (by status/date) |
|---|---|---|---|---|
| Meta | `BOOK#<id>` | `META` | `CUST#<customerId>` / `BOOK#<scheduledDate>#<id>` | `BOOKINGS` / `<status>#<scheduledDate>` |

### Job
| Item | PK | SK | GSI2 (by status) | GSI4 (by date) |
|---|---|---|---|---|
| Meta | `JOB#<id>` | `META` | `JOBSTATUS#<status>` / `<scheduledDate>#<id>` | `SCHED#<date>` / `JOB#<id>` |

- By booking: GSI1 `BOOK#<bookingId>` / `JOB`.
- **By technician** is via the assignment item below (a job's `assignedTechnicians`
  list can't be a GSI key). Denormalize `customerName` onto the job for lists.

### JobAssignment  ← the key to "jobs by technician" + workload
| Item | PK | SK | GSI3 (by technician) |
|---|---|---|---|
| Assignment | `JOB#<jobId>` | `ASSIGN#<techId>` | `TECH#<techId>` / `<status>#<scheduledDate>#<jobId>` |

- Jobs for a technician → `Query GSI3 TECH#<techId>`. Workload = count of that
  query where status is non-terminal (or a maintained counter).

### Photo
| Item | PK | SK | GSI4 (gallery, recent) |
|---|---|---|---|
| Photo | `JOB#<jobId>` | `PHOTO#<type>#<createdAt>#<id>` | `PHOTOS` / `<createdAt>#<id>` |

- Photos for a job / by gate → `Query PK=JOB#<jobId>` + `begins_with(SK,"PHOTO#before")`.

### Attendance
| Item | PK | SK | GSI4 (daily report) |
|---|---|---|---|
| Day record | `USER#<userId>` | `ATT#<date>` | `ATTDATE#<date>` / `USER#<userId>` |

- Unique per user+day (SK). History for a user → `Query PK=USER#<id>` +
  `begins_with(SK,"ATT#")`. All users on a date → GSI4.

### Review
| Item | PK | SK | GSI4 (recent) |
|---|---|---|---|
| Review | `REVIEW#<id>` | `META` | `REVIEWS` / `<reviewDate>#<id>` |

- Rating distribution / average → counters (§4).

### Session
| Item | PK | SK | GSI1 (by refresh hash) | GSI2 (by user) |
|---|---|---|---|---|
| Session | `SESSION#<sessionId>` | `META` | `RT#<tokenHash>` / `SESSION` | `USER#<userId>` / `SESSION#<sessionId>` |

- Rotate/verify → GSI1. Revoke-all-for-user → GSI2. `expiresAt` TTL auto-purges.

### AuditLog / PushSubscription / Role / Permission
| Entity | PK | SK | Notes |
|---|---|---|---|
| AuditLog | `AUDIT#<yyyy-mm>` | `<timestamp>#<id>` | time-bucketed; recent via `Query` desc. Optional TTL. |
| PushSubscription | `USER#<userId>` | `PUSH#<endpointHash>` | by-user query; GSI1 `ENDPOINT#<hash>` to dedupe. |
| Role / Permission | `ROLE#<name>` / `PERM#<key>` | `META` | tiny static set — or keep seeded in code. |

---

## 4. Aggregations → maintained counters (the biggest change)

The admin dashboard/reports do `count by status`, `today's jobs`, `completed`,
`pending approvals`, `rating distribution`, `7-day trend`, `workload`. DynamoDB
**cannot** compute these on read. Options, cheapest first:

1. **Counter items** updated transactionally on write. e.g.
   `PK=STATS SK=JOBSTATUS#<status>` with `ADD count 1/-1` inside the same
   `TransactWrite` that changes a job's status. Dashboard = a few `GetItem`s.
2. **DynamoDB Streams → Lambda** that maintains those counter items asynchronously
   (decouples the write path; eventually consistent).
3. Small-scale fallback: `Query` the relevant GSI and count in app code (fine for
   hundreds of rows, not thousands).

Use **(1)** for the KPI counts, **(2)** for rating distribution / trend buckets.

---

## 5. Search & pagination

- **Search** (customer name/mobile): mobile = exact GSI. Name "contains" is not a
  DynamoDB capability — stream customers to **OpenSearch Serverless** (or Algolia)
  and query that, or restrict the UI to `begins_with` prefix search.
- **Pagination**: replace `page/limit/skip` with an opaque **cursor**
  (`LastEvaluatedKey`, base64-encoded) returned to the client and passed back as
  `ExclusiveStartKey`. The list APIs' response shape changes from
  `{page,totalPages}` to `{items, nextCursor}`.

---

## 6. Migration plan (phased, non-breaking)

The app has a clean **service layer** already — every query is inside
`src/services/*`, not in routes/components. That's the seam to exploit.

1. **Repository abstraction.** Introduce `src/repositories/*` interfaces
   (`jobRepo.getById`, `jobRepo.listByStatus`, …). Point services at the repo, not
   Mongoose. (Refactor only — behavior identical, still on Mongo.)
2. **DynamoDB implementation.** Add `@aws-sdk/client-dynamodb` +
   `@aws-sdk/lib-dynamodb`; implement each repo against the single table + the keys
   above. A `DB_DRIVER=mongo|dynamo` env flag chooses the impl.
3. **Counters + Streams** for the aggregation access patterns.
4. **Search** (OpenSearch) if name-search must stay.
5. **Cut over** one entity at a time behind the flag; dual-read during validation;
   backfill existing data with a one-off export→transform→`BatchWrite` script.

Provision the table with CDK/Terraform/CLI (single table, 4 GSIs, Streams, TTL).

---

## 7. Consideration before committing

DynamoDB shines for **known access patterns at high scale**. This app is
**aggregation- and report-heavy** (dashboards, distributions, trends, search),
which is exactly DynamoDB's weak spot and adds the counter/Streams/OpenSearch
machinery above. **MongoDB Atlas** already scales to serious production load with
none of that rework. Worth a deliberate decision: migrate for a specific reason
(cost model, existing AWS-native stack, extreme scale), not by default.

# Database Schema

> MongoDB + Mongoose. All collections use Mongoose `timestamps` (`createdAt`,
> `updatedAt`). `_id` is the default ObjectId. Field names are camelCase.

---

## Entity Relationship Overview

```
roleModel ──→ permissionModel        (role.permissions[] reference permission keys)
userModel.role ──→ roleModel.name
userModel ───< sessionModel          (one row per active login/device)

userModel (admin | technician)
   │
   │ createdBy / assignedTechnician
   ▼
customerModel ───< bookingModel ───1:1─── jobModel ───< photoModel
                                              │
                                              └──1:1── reviewModel

userModel (technician) ───< attendanceModel
```

- A **user** has a **role**, which grants a set of **permissions**.
- A **user** has many **sessions** (devices), each holding a hashed refresh token.
- A **customer** has many **bookings**.
- A **booking** produces exactly one **job** when scheduled.
- A **job** is assigned to one **technician** and has many **photos** (before/after).
- A **job** can have one **review** (left by the customer).
- A **technician** has many **attendance** records (one active session per day).

---

## 1. userModel

Authentication + staff directory for both roles.

| Field                     | Type        | Required | Notes                                    |
| ------------------------- | ----------- | -------- | ---------------------------------------- |
| `name`                    | String      | ✓        | Full name                                |
| `email`                   | String      | ✓        | Unique, lowercased, trimmed              |
| `phone`                   | String      | ✓        | Unique, E.164-ish                        |
| `passwordHash`            | String      | ✓        | bcrypt hash; `select: false`             |
| `role`                    | String enum | ✓        | `admin` \| `technician`                  |
| `status`                  | String enum | ✓        | `active` \| `inactive`; default `active` |
| `lastLoginAt`             | Date        |          | Updated on login                         |
| `passwordResetTokenHash`  | String      |          | sha256 of reset token; `select: false`   |
| `passwordResetExpiresAt`  | Date        |          | Reset link expiry; `select: false`       |
| `createdAt` / `updatedAt` | Date        | auto     |                                          |

**Indexes:** `{ email: 1 }` unique, `{ phone: 1 }` unique, `{ role: 1, status: 1 }`.

See [`authenticationFlow.md`](./authenticationFlow.md) for how these fields drive
login, refresh, and password reset.

---

## 2. customerModel

See [`customerModule.md`](./customerModule.md) for CRUD, search, and history.

| Field               | Type                 | Required | Notes                                    |
| ------------------- | -------------------- | -------- | ---------------------------------------- |
| `customerName`      | String               | ✓        |                                          |
| `mobileNumber`      | String               | ✓        | Indexed; primary lookup key              |
| `address`           | String               | ✓        | Free-text (multi-line)                   |
| `googleMapLocation` | String               |          | Google Maps URL (optional)               |
| `notes`             | String               |          | Free text from calling staff             |
| `status`            | String enum          | ✓        | `active` \| `inactive`; default `active` |
| `createdBy`         | ObjectId → userModel | ✓        | Staff who created the record             |

**Indexes:** `{ mobileNumber: 1 }`, `{ status: 1 }`, and a text index on
`{ customerName, mobileNumber, address }` for search.

---

## 3. bookingModel

A customer request captured by calling staff, before it becomes a scheduled job.
See [`bookingWorkflow.md`](./bookingWorkflow.md).

| Field                 | Type                     | Required | Notes                                                                   |
| --------------------- | ------------------------ | -------- | ----------------------------------------------------------------------- |
| `customerId`          | ObjectId → customerModel | ✓        |                                                                         |
| `tankType`            | String enum              | ✓        | `overhead` \| `underground` \| `sump` \| `loft` \| `other`              |
| `tankCapacity`        | Number                   | ✓        | Litres (≥ 1)                                                            |
| `numberOfTanks`       | Number                   | ✓        | ≥ 1                                                                     |
| `scheduledDate`       | Date                     | ✓        | Requested service date                                                  |
| `scheduledTime`       | String                   |          | `HH:mm` (optional)                                                      |
| `specialInstructions` | String                   |          |                                                                         |
| `bookingStatus`       | String enum              | ✓        | `pending` \| `scheduled` \| `rescheduled` \| `completed` \| `cancelled` |
| `statusHistory`       | Array                    |          | `[{ status, at, by, note }]` audit trail                                |
| `cancellationReason`  | String                   |          | Set on cancel                                                           |
| `createdBy`           | ObjectId → userModel     | ✓        | Calling staff                                                           |

**Indexes:** `{ customerId: 1 }`, `{ bookingStatus: 1, scheduledDate: 1 }`, `{ createdAt: -1 }`.

---

## 4. jobModel

The operational unit a technician executes. Carries the workflow state machine.

| Field                | Type                     | Required | Notes                                                |
| -------------------- | ------------------------ | -------- | ---------------------------------------------------- |
| `jobCode`            | String                   | ✓        | Human-friendly unique code, e.g. `WTC-20260626-0001` |
| `booking`            | ObjectId → bookingModel  | ✓        | Unique (1:1)                                         |
| `customer`           | ObjectId → customerModel | ✓        | Denormalised for fast field reads                    |
| `assignedTechnician` | ObjectId → userModel     |          | Current technician (set at assignment)               |
| `scheduledDate`      | Date                     |          |                                                      |
| `scheduledTime`      | String                   |          | `HH:mm`                                              |
| `scheduledSlot`      | String enum              |          | Legacy `morning` \| `afternoon` \| `evening`         |
| `status`             | String enum              | ✓        | See [jobWorkflow.md](./jobWorkflow.md)               |
| `statusHistory`      | Array                    |          | `[{ status, at, by, note }]` audit trail             |
| `startedAt`          | Date                     |          | Technician started on site                           |
| `completedAt`        | Date                     |          |                                                      |
| `beforePhotos`       | [ObjectId → photoModel]  |          |                                                      |
| `afterPhotos`        | [ObjectId → photoModel]  |          |                                                      |
| `completionNotes`    | String                   |          |                                                      |
| `priceFinal`         | Number                   |          | Paise                                                |
| `paymentStatus`      | String enum              |          | `unpaid` \| `paid` \| `partial`                      |
| `createdBy`          | ObjectId → userModel     | ✓        |                                                      |

**Status enum:** `pending` → `scheduled` → `assigned` → `reachedSite` →
`beforePhotoPendingApproval` → `cleaningInProgress` → `afterPhotoPendingApproval` →
`completed`; plus `cancelled`. See [jobWorkflow.md](./jobWorkflow.md).

**Indexes:** `{ jobCode: 1 }` unique, `{ booking: 1 }` unique,
`{ assignedTechnician: 1, status: 1 }`, `{ assignedTechnician: 1, scheduledDate: 1 }`,
`{ scheduledDate: 1 }`, `{ status: 1 }`.

---

## 4a. jobAssignmentModel

One record per technician↔job assignment (reassignment creates a new active row).
See [schedulingArchitecture.md](./schedulingArchitecture.md).

| Field           | Type                 | Required | Notes                                   |
| --------------- | -------------------- | -------- | --------------------------------------- |
| `job`           | ObjectId → jobModel  | ✓        |                                         |
| `technician`    | ObjectId → userModel | ✓        |                                         |
| `assignedBy`    | ObjectId → userModel | ✓        | Admin who assigned                      |
| `assignedAt`    | Date                 | ✓        |                                         |
| `scheduledDate` | Date                 | ✓        | Snapshot at assignment                  |
| `scheduledTime` | String               |          | `HH:mm`                                 |
| `status`        | String enum          | ✓        | `active` \| `reassigned` \| `cancelled` |
| `note`          | String               |          | e.g. reassignment reason                |

**Indexes:** `{ job: 1, status: 1 }`, `{ technician: 1, scheduledDate: 1, status: 1 }`.

---

## 5. attendanceModel

Technician check-in / check-out with auto-classified status. See
[`attendanceWorkflow.md`](./attendanceWorkflow.md).

| Field          | Type                 | Required | Notes                                               |
| -------------- | -------------------- | -------- | --------------------------------------------------- |
| `userId`       | ObjectId → userModel | ✓        | The technician                                      |
| `date`         | String               | ✓        | `YYYY-MM-DD` (local day key)                        |
| `checkInTime`  | Date                 | ✓        | Set on check-in                                     |
| `checkOutTime` | Date                 |          | Null while session open                             |
| `workingHours` | Number               |          | Decimal hours, computed on check-out                |
| `status`       | String enum          | ✓        | `present` \| `late` \| `halfDay` (`absent` derived) |
| `geoLocation`  | Object               |          | `{ checkIn?, checkOut? }` each `{ lat, lng }`       |

**Indexes:** `{ userId: 1, date: 1 }` unique (one record per user per day — backs
the duplicate-check-in guard), `{ date: 1 }`, `{ status: 1 }`.

---

## 6. photoModel

Each before/after image. Stored in Cloudflare R2; only metadata in Mongo. See
[`photoArchitecture.md`](./photoArchitecture.md).

| Field             | Type                 | Required | Notes                                                               |
| ----------------- | -------------------- | -------- | ------------------------------------------------------------------- |
| `jobId`           | ObjectId → jobModel  | ✓        |                                                                     |
| `photoType`       | String enum          | ✓        | `before` \| `after`                                                 |
| `photoUrl`        | String               | ✓        | Public/CDN URL                                                      |
| `s3Key`           | String               | ✓        | Object key in the R2 bucket                                         |
| `uploadedBy`      | ObjectId → userModel | ✓        | Technician                                                          |
| `approvalStatus`  | String enum          | ✓        | `pending` \| `approved` \| `rejected`; default `pending`            |
| `rejectionReason` | String               |          | Set by admin on reject                                              |
| `reviewedBy`      | ObjectId → userModel |          | Admin who approved/rejected                                         |
| `reviewedAt`      | Date                 |          |                                                                     |
| `metadata`        | Object               | ✓        | `{ contentType, sizeBytes?, width?, height?, originalName?, geo? }` |
| `createdAt`       | Date (timestamp)     | auto     | Upload time                                                         |

**Indexes:** `{ jobId: 1, photoType: 1 }`, `{ approvalStatus: 1 }`. The row is
written on **confirm** (post-upload), so failed uploads leave no orphan record.

---

## 7. reviewModel

Customer feedback after job completion. See [`reviewModule.md`](./reviewModule.md).

| Field                | Type                     | Required | Notes                                      |
| -------------------- | ------------------------ | -------- | ------------------------------------------ |
| `jobId`              | ObjectId → jobModel      | ✓        | Unique (1:1)                               |
| `customerId`         | ObjectId → customerModel | ✓        |                                            |
| `technicianId`       | ObjectId → userModel     |          | The technician being rated                 |
| `starRating`         | Number                   | ✓        | 1–5                                        |
| `reviewComment`      | String                   |          |                                            |
| `satisfactionStatus` | String enum              | ✓        | `satisfied` \| `neutral` \| `dissatisfied` |
| `reviewDate`         | Date                     | ✓        | Defaults to now                            |
| `collectedBy`        | ObjectId → userModel     |          | Staff who recorded it                      |
| `source`             | String enum              |          | `phone` \| `link`                          |

**Indexes:** `{ jobId: 1 }` unique, `{ technicianId: 1 }`, `{ starRating: 1 }`,
`{ satisfactionStatus: 1 }`.

---

## 8. roleModel

A role groups a set of permission keys. The two system roles (`admin`,
`technician`) are seeded; roles are editable but system roles cannot be deleted.

| Field         | Type     | Required | Notes                                       |
| ------------- | -------- | -------- | ------------------------------------------- |
| `name`        | String   | ✓        | Unique — `admin` \| `technician` \| …       |
| `description` | String   |          |                                             |
| `permissions` | [String] | ✓        | Permission keys (e.g. `customers:read`)     |
| `isSystem`    | Boolean  | ✓        | System roles are protected; default `false` |

**Indexes:** `{ name: 1 }` unique.

---

## 9. permissionModel

The catalogue of fine-grained permission keys, seeded from
`src/constants/permissions.ts`.

| Field         | Type   | Required | Notes                      |
| ------------- | ------ | -------- | -------------------------- |
| `key`         | String | ✓        | Unique — `resource:action` |
| `description` | String | ✓        | Human-friendly label       |

**Indexes:** `{ key: 1 }` unique.

---

## 10. sessionModel

A persisted login session (one per device). Holds the **hash** of the current
refresh token, never the token itself; refresh tokens rotate on every use.

| Field        | Type                 | Required | Notes                                  |
| ------------ | -------------------- | -------- | -------------------------------------- |
| `user`       | ObjectId → userModel | ✓        |                                        |
| `tokenHash`  | String               | ✓        | sha256 of the current refresh secret   |
| `userAgent`  | String               |          | Captured at login/refresh              |
| `ip`         | String               |          | Captured at login/refresh              |
| `expiresAt`  | Date                 | ✓        | TTL — Mongo auto-removes expired rows  |
| `lastUsedAt` | Date                 | ✓        | Updated on each refresh                |
| `revokedAt`  | Date                 |          | Set on logout / reuse / password reset |

**Indexes:** `{ user: 1 }`, `{ expiresAt: 1 }` TTL (`expireAfterSeconds: 0`).

---

## 11. pushSubscriptionModel

A device's Web Push subscription, tied to a user. See [`pwa.md`](./pwa.md).

| Field       | Type                 | Required | Notes                    |
| ----------- | -------------------- | -------- | ------------------------ |
| `user`      | ObjectId → userModel | ✓        | Owner (indexed)          |
| `endpoint`  | String               | ✓        | Unique push endpoint URL |
| `keys`      | Object               | ✓        | `{ p256dh, auth }`       |
| `userAgent` | String               |          | Device hint              |

**Indexes:** `{ user: 1 }`, `{ endpoint: 1 }` unique. Dead subscriptions
(404/410 on send) are pruned automatically.

---

## 12. auditLogModel

Immutable record of sensitive actions (logins, photo approvals/rejections, job
cancellations, customer deletions). Viewable at `/audit` (admin).

| Field        | Type                 | Required | Notes                               |
| ------------ | -------------------- | -------- | ----------------------------------- |
| `actor`      | ObjectId → userModel |          | Who performed the action            |
| `actorName`  | String               |          | Denormalised for display            |
| `action`     | String               | ✓        | e.g. `auth.login`, `photo.approve`  |
| `entityType` | String               |          | `photo` \| `job` \| `customer` \| … |
| `entityId`   | String               |          | Affected record id                  |
| `meta`       | Mixed                |          | Extra context (reason, etc.)        |
| `ip`         | String               |          | Source IP                           |

**Indexes:** `{ createdAt: -1 }`, `{ action: 1 }`, `{ actor: 1 }`.

---

## Cross-cutting conventions

- **Soft references, not joins.** Use `populate` sparingly on read paths; prefer
  denormalised fields (`customer` on `jobModel`) for hot field-side reads.
- **Money** is stored as integer **paise** to avoid float errors.
- **Day keys** (`attendanceModel.date`) are stored as `YYYY-MM-DD` strings to make
  "one per day" uniqueness and grouping trivial.
- **Audit trail.** `jobModel.statusHistory` and `createdBy` give a full paper trail.
- **Enums** are defined once in `src/constants/` and reused by models, Zod schemas,
  and the UI — never hard-coded strings.

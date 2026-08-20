# Cleanify — System Workflow & Flowcharts

> Full workflow of the Cleanify admin + field app after the **Admin Panel v2**
> revision. Diagrams are [Mermaid](https://mermaid.js.org) — they render in
> GitHub, VS Code (with a Mermaid extension), and most Markdown viewers.

---

## 1. What was requested vs. what was built (C1–C9)

| # | Morning spec item | Status | Where it lives |
|---|-------------------|--------|----------------|
| **C1** | **Booking Desk** — merge Customers + Bookings + Schedule into one screen | ✅ Done | `/booking-desk` (tabs: New booking · All bookings · Customers · Pending scheduling) |
| **C2** | **Work Photos & Approvals** — job photos + approve/decline | ✅ Done | `/work-approvals` (tabs: Pending · Approved · Declined · All photos) |
| **C3** | **Super-Admin Calendar** — colour-coded, drawer, per-worker day | ✅ Done | `/calendar` |
| **C4** | **Time scheduling + assignment** — start time, duration, supervisor, conflicts, attendance | ✅ Done | Job edit + intake + scheduling service |
| **C5** | **Pre-work check** — machinery + uniform/mask photos, approval gate | ✅ Done | Worker job screen → submission → approvals |
| **C6** | **Notifications** — in-app bell + badges (web-push kept) | ✅ Done | Topbar bell (both roles) + sidebar badge |
| **C7** | **Mid-job reschedule** — editable schedule on active jobs, notify crew, audit | ✅ Done | Calendar drawer + job edit + audit log |
| **C8** | **Completion approval** — completion photos, approval gate | ✅ Done | Worker job screen → submission → approvals |
| **C9** | **Review & staff rating** — customer review + per-crew rating, closes job | ✅ Done | Reviews screen; closes job on capture |

**Decisions locked in:** supervisor = a technician designated *per job* (no new
login role); the photo-approval gate is **hard** (can't start without approved
pre-work, can't complete without approved completion); approvers = **admins +
the job's supervisor**.

> ⚠️ **Testing note:** everything compiles and the production build is green, but
> the end-to-end run against the spec has **not** been executed on the live
> (production) database yet — that's the one remaining step.

---

## 2. High-level architecture

```mermaid
flowchart TB
    subgraph Client["Single PWA — no native app"]
        AdminUI["Admin — PWA on desktop"]
        FieldUI["Field — PWA in phone browser<br/>(installable, offline-capable)"]
    end

    subgraph Edge["Next.js middleware (edge)"]
        MW["JWT verify + RBAC<br/>role → route gate"]
    end

    subgraph Server["Next.js App Router (server)"]
        API["/api/* route handlers<br/>requireRole + Zod validation"]
        SVC["Service layer<br/>(all DB access + business rules)"]
        WF["applyJobTransition<br/>(single state-machine gate)"]
    end

    subgraph Data["Data + integrations"]
        DB[("MongoDB / Mongoose")]
        S3[("AWS S3<br/>photos")]
        PUSH["Web-push (VAPID)"]
    end

    AdminUI --> MW
    FieldUI --> MW
    MW --> API
    API --> SVC
    SVC --> WF
    SVC --> DB
    FieldUI -- "presigned PUT" --> S3
    SVC -- "public URL" --> S3
    SVC --> PUSH
```

**Layers:** UI → middleware (auth + role gate) → API route (role re-check + Zod)
→ service (business logic, the only place that touches the DB) → models. Every
status change flows through `applyJobTransition` so the lifecycle has a single
enforcement point. Every meaningful action is written to the **audit log**.

> **One app, no native mobile app.** The whole system is a single installable
> **PWA** (Progressive Web App). The "field app" is the same website opened in a
> technician's **phone browser** — add-to-home-screen makes it feel app-like
> (home-screen icon, offline, push notifications), but there is no separate
> iOS/Android app to build or publish.

---

## 3. The job lifecycle — full state machine (C12)

This is the heart of v2. A job is **BOOKED**, gets **SCHEDULED**/assigned, then
runs through **two approval gates** (pre-work and completion) before it can be
**COMPLETED** and finally **CLOSED** after the review.

```mermaid
stateDiagram-v2
    [*] --> pending: booking created
    pending --> scheduled: date set
    scheduled --> assigned: crew + supervisor assigned
    scheduled --> rescheduled
    assigned --> reachedSite: worker checks in + arrives
    assigned --> rescheduled

    reachedSite --> preWorkPendingApproval: submit pre-work<br/>(machinery + uniform/mask)
    preWorkPendingApproval --> cleaningInProgress: APPROVE (admin/supervisor)
    preWorkPendingApproval --> reachedSite: DECLINE (with reason)

    cleaningInProgress --> completionPendingApproval: submit completion<br/>(≥2 photos)
    completionPendingApproval --> completed: APPROVE (admin/supervisor)
    completionPendingApproval --> cleaningInProgress: DECLINE (rework)

    completed --> closed: customer review + staff ratings captured

    pending --> cancelled
    scheduled --> cancelled
    assigned --> cancelled
    reachedSite --> cancelled
    cleaningInProgress --> cancelled

    closed --> [*]
    cancelled --> [*]
    rescheduled --> [*]
```

**Colour scheme on the calendar** (`statusMeta`): grey = scheduled · amber =
pre-work approval / on-site · blue = in progress · purple = completion approval ·
green = completed / closed · red = cancelled.

---

## 4. Booking Desk workflow (C1)

One screen replaces the old Customers → Bookings → Schedule hop. A booking
**always** spawns a Job automatically.

```mermaid
flowchart TD
    Start([Sales opens Booking Desk]) --> Tab{Which tab?}
    Tab -->|New booking| New[Job-card intake form]
    Tab -->|All bookings| BT[Booking table]
    Tab -->|Customers| CT[Customer table]
    Tab -->|Pending scheduling| PS[Unassigned jobs list]

    New --> Cust{Customer?}
    Cust -->|Existing| Pick[Search + select]
    Cust -->|New| Create[Inline create<br/>name + mobile + map link]
    Pick --> Fill
    Create --> Fill[Service, items, charge,<br/>date, start time, duration]
    Fill --> Crew{Assign crew now?}
    Crew -->|Yes| Assign[Pick workers + supervisor<br/>availability pre-checked]
    Crew -->|No| Later[Leave for Pending scheduling]
    Assign --> Save
    Later --> Save[(Customer + Booking + Job created)]
    Save --> Notify[Assigned workers notified]

    PS --> Schedule["Schedule & assign<br/>(opens job edit)"]
```

Every booking → job link is kept in sync: editing the booking propagates work
name, service, items, charge, map link, landmark and duration to the linked
non-terminal job.

---

## 5. Scheduling, assignment & the calendar (C3 + C4)

```mermaid
flowchart TD
    A[Admin assigns/reassigns a job] --> B[Pick date + start time + duration]
    B --> C[Pick crew + designate supervisor]
    C --> D{For each worker:<br/>available?}
    D -->|Active + no time clash + under daily cap| OK[Assign ✓]
    D -->|Time range overlaps another job + buffer| Clash[❌ Names the clashing job]
    D -->|At daily capacity| Cap[❌ At capacity]
    OK --> Persist[(Save schedule, duration,<br/>supervisor, assignments)]
    Persist --> Notif[Notify crew in-app + push]

    subgraph Calendar["Super-Admin Calendar"]
        Month[Month grid] --> Drawer
        Week[Week grid] --> Drawer
        Day["Day view<br/>(list OR per-worker columns)"] --> Drawer
        Drawer[Click a job → side drawer<br/>detail · reschedule · open & manage · photos]
    end
```

- **Conflict check** compares time *ranges* (`start → start+duration`) with a
  configurable **travel/setup buffer**, not just identical slots.
- **Attendance-aware:** each worker chip shows today's attendance (present /
  late / half-day / not checked in) so you don't assign an absent worker.
- **Durations** default per service type (editable per job).

---

## 6. Pre-work approval loop (C5) — the field ↔ office handshake

```mermaid
sequenceDiagram
    actor W as Worker (field app)
    participant J as Job service
    actor A as Admin / Supervisor
    participant N as Notifications

    W->>J: Reached site (must be checked in)
    Note over J: status = reachedSite
    W->>W: Photograph machinery + uniform/mask
    W->>J: Submit pre-work (photoIds)
    J->>J: Validate categories → status = preWorkPendingApproval
    J->>N: Notify admins + supervisor
    A->>A: Review photos in Work Photos & Approvals
    alt Approved
        A->>J: Approve
        J->>J: status = cleaningInProgress
        J->>N: Notify worker "you can start work"
    else Declined
        A->>J: Decline (mandatory reason)
        J->>J: status = reachedSite (redo)
        J->>N: Notify worker with the reason
    end
```

The worker **cannot start cleaning** until pre-work is approved — the "Start
work" path is blocked server-side.

---

## 7. Completion approval loop (C8)

```mermaid
sequenceDiagram
    actor W as Worker
    participant J as Job service
    actor A as Admin / Supervisor
    participant N as Notifications

    Note over J: status = cleaningInProgress
    W->>W: Clean, then take ≥2 completion photos
    W->>J: Submit completion (photoIds + notes)
    J->>J: status = completionPendingApproval
    J->>N: Notify admins + supervisor
    alt Approved
        A->>J: Approve
        J->>J: status = completed
        J->>N: Notify worker "completion approved"
    else Declined
        A->>J: Decline (reason)
        J->>J: status = cleaningInProgress (rework)
        J->>N: Notify worker with the reason
    end
```

---

## 8. Review & close + staff rating (C9)

```mermaid
flowchart TD
    Done[Job = completed] --> Rev[Admin opens Reviews → Add review]
    Rev --> Cust[Customer star rating + comment + satisfaction]
    Rev --> Staff["Per-crew star ratings (internal, optional)"]
    Cust --> Save
    Staff --> Save[(Review saved + staff ratings saved)]
    Save --> Close[Job → CLOSED]
    Close --> Roll[Rolls into: Dashboard avg rating,<br/>Reviews metrics, Reports]
```

Capturing the customer review is what **closes** the job. Reports/dashboards
count both `completed` and `closed` as "done" so numbers never drop when a job
is closed.

---

## 9. Notifications (C6)

```mermaid
flowchart LR
    subgraph Events
        E1[Job assigned / reassigned]
        E2[Job rescheduled]
        E3[Pre-work submitted]
        E4[Pre-work approved / declined]
        E5[Completion submitted]
        E6[Completion approved / declined]
    end
    Events --> Emit[inAppNotificationService.emit]
    Emit --> Rec[(Notification record<br/>per user)]
    Emit --> Push[Web-push best-effort]
    Rec --> Bell["🔔 Topbar bell<br/>(admins + workers)"]
    Rec --> Badge["Sidebar badge<br/>Work Photos & Approvals"]
```

- **Workers** get: assigned / reassigned / rescheduled / approved / declined.
- **Admins + supervisor** get: pre-work & completion submitted (needs approval).
- Bell + badge poll about once a minute; clicking a notification opens the
  relevant screen and marks it read.

---

## 10. Roles & route map

```mermaid
flowchart TB
    subgraph Roles
        Admin["admin<br/>(supervisor = admin OR a technician marked<br/>as supervisor on that job)"]
        Tech["technician"]
    end

    Admin --> AdminNav
    subgraph AdminNav["Admin sidebar (10 sections)"]
        direction TB
        n1[Dashboard]
        n2[Calendar]
        n3[Booking Desk]
        n4[Jobs]
        n5["Work Photos & Approvals ⬤ badge"]
        n6[Reviews]
        n7[Attendance]
        n8[Reports]
        n9["Staff (incl. account approvals)"]
        n10[Audit log]
    end

    Tech --> TechNav
    subgraph TechNav["Field bottom-nav"]
        t1[Home]
        t2[Jobs]
        t3[Attendance]
        t4[Profile]
    end
```

Old URLs still work: `/customers`, `/bookings` → Booking Desk tabs;
`/schedule` → `/calendar`; `/photos` → `/work-approvals`; `/approvals` →
Staff → Pending approvals.

---

## 11. Data model (key entities added / changed in v2)

```mermaid
erDiagram
    CUSTOMER ||--o{ BOOKING : has
    BOOKING ||--|| JOB : "auto-creates"
    JOB ||--o{ JOB_SUBMISSION : "pre-work / completion"
    JOB_SUBMISSION ||--o{ PHOTO : bundles
    JOB ||--o{ PHOTO : "before/after (legacy)"
    JOB ||--o| REVIEW : "customer review"
    JOB ||--o{ STAFF_RATING : "per crew member"
    USER ||--o{ JOB : "assigned / supervises"
    USER ||--o{ NOTIFICATION : receives

    JOB {
        string status
        ObjectId supervisor "a technician"
        int estimatedDurationMins
        string scheduledTime
        ObjectId rescheduledFromJobId
        string cancellationReason
    }
    JOB_SUBMISSION {
        string type "preWork | completion"
        string status "pending | approved | declined"
        string declineReason
    }
    PHOTO {
        string photoType "machinery | uniformMask | completion | before | after"
        ObjectId submissionId
    }
    STAFF_RATING {
        int rating "1..5"
        string remark
    }
    NOTIFICATION {
        string type
        bool isRead
    }
```

**New collections:** `JobSubmission`, `Notification`, `StaffRating`.
**Extended:** `Job` (supervisor, duration, reschedule/cancel fields),
`Booking` (duration), `Photo` (new categories + submission link),
`Review` (per-job, plus staff ratings alongside).

---

## 12. End-to-end happy path (one glance)

```mermaid
flowchart LR
    A[Booking Desk:<br/>customer + booking] --> B[Job auto-created]
    B --> C[Calendar:<br/>schedule + assign + supervisor]
    C --> D[Worker: reached site]
    D --> E[Worker: pre-work photos → submit]
    E --> F{Admin/Supervisor}
    F -->|approve| G[Worker: clean + completion photos → submit]
    F -->|decline| E
    G --> H{Admin/Supervisor}
    H -->|approve| I[Job completed]
    H -->|decline| G
    I --> J[Admin: customer review + staff ratings]
    J --> K[Job closed → reports/dashboard]
```

---

*Generated for the Cleanify B2B/ops handover. Contact:
cleanifycleaningservice88@gmail.com · 8848483892.*

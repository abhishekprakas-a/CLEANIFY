# Customer Review Module

> Capture customer feedback for completed jobs and surface satisfaction metrics:
> average rating, per-technician ratings, rating distribution, satisfaction
> breakdown, and review history. Includes reusable star-rating components.

---

## 1. Data model (`reviewModel`)

| Field                | Type                     | Required | Notes                                      |
| -------------------- | ------------------------ | -------- | ------------------------------------------ |
| `jobId`              | ObjectId → jobModel      | ✓        | Unique (one review per job)                |
| `customerId`         | ObjectId → customerModel | ✓        | Copied from the job                        |
| `technicianId`       | ObjectId → userModel     |          | The technician being rated (from the job)  |
| `starRating`         | Number                   | ✓        | 1–5                                        |
| `reviewComment`      | String                   |          | Free text                                  |
| `satisfactionStatus` | String enum              | ✓        | `satisfied` \| `neutral` \| `dissatisfied` |
| `reviewDate`         | Date                     | ✓        | Defaults to now                            |
| `collectedBy`        | ObjectId → userModel     |          | Staff who recorded it                      |
| `source`             | String enum              |          | `phone` \| `link`                          |

**Indexes:** `{ jobId: 1 }` unique, `{ technicianId: 1 }`, `{ starRating: 1 }`,
`{ satisfactionStatus: 1 }`.

`satisfactionStatus` is **derived from the rating** when not supplied
(`satisfactionFromRating`: ≥4 → satisfied, 3 → neutral, ≤2 → dissatisfied), and is
overridable by the admin.

---

## 2. Creating a review

Only **completed** jobs can be reviewed, and each job can be reviewed once
(enforced by the unique `jobId` index + a service check). `customerId` and
`technicianId` are taken from the job, so the admin only supplies the rating,
comment, and (optional) satisfaction override.

```
POST /api/reviews { jobId, starRating, reviewComment?, satisfactionStatus?, reviewDate?, source? }
  → job must be completed and unreviewed
  → 201 { review }
```

The admin form lists **reviewable jobs** (completed, not yet reviewed) from
`GET /api/reviews/reviewableJobs`.

---

## 3. Metrics (`GET /api/reviews/summary`)

`reviewService.summary()` aggregates:

```jsonc
{
  "totalReviews": 42,
  "averageRating": 4.3,
  "ratingDistribution": { "1": 1, "2": 2, "3": 5, "4": 14, "5": 20 },
  "satisfaction": { "satisfied": 34, "neutral": 5, "dissatisfied": 3 },
  "technicianRatings": [
    {
      "technicianId": "…",
      "name": "Asha",
      "averageRating": 4.7,
      "reviewCount": 12,
    },
  ],
}
```

- **Average rating** — mean `starRating` across all reviews.
- **Rating distribution** — count per star (1–5).
- **Satisfaction** — counts per band.
- **Technician ratings** — per-technician average + count (Mongo `$group` +
  `$lookup` on users), sorted best-first.

---

## 4. API

| Method | Path                                      | Permission      | Purpose                           |
| ------ | ----------------------------------------- | --------------- | --------------------------------- |
| GET    | `/api/reviews?page=&limit=&technicianId=` | `reviews:read`  | Paginated review history          |
| POST   | `/api/reviews`                            | `reviews:write` | Add a review for a completed job  |
| GET    | `/api/reviews/summary`                    | `reviews:read`  | Aggregate metrics                 |
| GET    | `/api/reviews/reviewableJobs`             | `reviews:write` | Completed jobs with no review yet |

Validation: `createReviewSchema` (`src/schemas/reviewSchema.ts`).

---

## 5. Reusable rating component

[`StarRating`](../src/components/ui/starRating.tsx) is shared across the module:

```tsx
<StarRating value={4.3} readOnly />              // display (rounds for fill)
<StarRating value={rating} onChange={setRating} size="lg" />  // 1–5 input
```

Used by the metrics cards, the technician table, the review history, and the add
form.

---

## 6. Admin UI

`/reviews` renders [`ReviewsDashboard`](../src/components/reviews/reviewsDashboard.tsx):

- [`ReviewMetrics`](../src/components/reviews/reviewMetrics.tsx) — average rating,
  satisfaction breakdown (with %), rating-distribution bars, technician table.
- [`ReviewForm`](../src/components/reviews/reviewForm.tsx) — pick a completed job,
  set stars (auto-fills satisfaction, overridable), add a comment, save.
- [`ReviewHistory`](../src/components/reviews/reviewHistory.tsx) — paginated list
  with stars, customer, technician, comment, satisfaction badge, date.

Creating a review refreshes the metrics and history in place.

---

## 7. Notes & future work

- **Customer-facing reviews:** reviews are admin-recorded today (`source: phone`).
  A public review link (`source: link`) could let customers submit directly.
- **Editing:** reviews are create-only; add an update/delete endpoint if
  corrections are needed.
- **Time filtering:** `summary` is all-time; add a date range for periodic reports.

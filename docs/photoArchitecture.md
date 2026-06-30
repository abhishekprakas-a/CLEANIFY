# Photo Architecture

> Before/after cleaning photos: client-side compression, presigned direct-to-storage
> upload with progress + retry, a two-gate approval workflow, and an admin review
> panel. Storage is Cloudflare R2 (S3-compatible API).

---

## 1. Data model (`photoModel`)

| Field             | Type                 | Required | Notes                                                               |
| ----------------- | -------------------- | -------- | ------------------------------------------------------------------- |
| `jobId`           | ObjectId → jobModel  | ✓        |                                                                     |
| `photoType`       | String enum          | ✓        | `before` \| `after`                                                 |
| `photoUrl`        | String               | ✓        | Public/CDN URL                                                      |
| `s3Key`           | String               | ✓        | Object key in the bucket                                            |
| `uploadedBy`      | ObjectId → userModel | ✓        | Technician                                                          |
| `approvalStatus`  | String enum          | ✓        | `pending` \| `approved` \| `rejected`                               |
| `rejectionReason` | String               |          | Set on reject                                                       |
| `reviewedBy`      | ObjectId → userModel |          | Admin reviewer                                                      |
| `reviewedAt`      | Date                 |          |                                                                     |
| `metadata`        | Object               | ✓        | `{ contentType, sizeBytes?, width?, height?, originalName?, geo? }` |
| `createdAt`       | Date (timestamp)     | auto     | Upload time                                                         |

**Indexes:** `{ jobId: 1, photoType: 1 }`, `{ approvalStatus: 1 }`. The record is
created on **confirm** (after the upload), so a failed/retried upload never leaves
an orphan row, and gate counts stay accurate.

---

## 2. Upload pipeline (technician)

```
pick image(s)  ([PhotoUploader])
   │  compressImage()  → downscale ≤1600px, re-encode JPEG q0.7 (skips if larger)
   ▼
POST /api/photos/presign { jobId, photoType, contentType }
   → server validates job ownership, returns { uploadUrl, s3Key, publicUrl }
   ▼
PUT uploadUrl  (XHR, withRetry ×2)        ── upload progress 0–100% per file
   ▼
POST /api/photos/confirm { jobId, photoType, s3Key, photoUrl, contentType,
                           sizeBytes, width, height, originalName, geo }
   → server re-validates ownership + s3Key prefix, creates the photo record,
     attaches it to the job's before/after array
```

Pieces:

- **Compression** — [`lib/image/compress.ts`](../src/lib/image/compress.ts) uses a
  canvas to shrink + JPEG-encode before upload (smaller, faster, cheaper).
- **Progress + retry** — [`lib/image/upload.ts`](../src/lib/image/upload.ts):
  `putWithProgress` (XHR `upload.onprogress`) and `withRetry` (backoff).
- **UI** — [`PhotoUploader`](../src/components/technician/photoUploader.tsx):
  multi-select, live **previews**, per-file **progress %**, per-file **Retry** on
  failure, and approval badges on already-uploaded photos.

> Direct browser→R2 upload keeps large image bytes out of the serverless function.
> Bucket **CORS** must allow `PUT` from the app origin (see
> [`developmentGuide.md`](./developmentGuide.md) §10).

---

## 3. Approval workflow (two gates)

Photos drive the job's two approval gates (full machine in
[`jobWorkflow.md`](./jobWorkflow.md)):

| Gate   | Submit                                           | All approved           | Any rejected                    |
| ------ | ------------------------------------------------ | ---------------------- | ------------------------------- |
| Before | `reachedSite → beforePhotoPendingApproval`       | → `cleaningInProgress` | → `reachedSite` (retake)        |
| After  | `cleaningInProgress → afterPhotoPendingApproval` | → `completed`          | → `cleaningInProgress` (retake) |

`photoService.advanceGate(jobId, photoType)` advances the job only when **every**
photo of that gate is `approved`. A rejection records the reason and sends the job
back via `applyJobTransition`, so the technician re-uploads.

---

## 4. Admin review panel

`/approvals` renders [`PhotoReviewPanel`](../src/components/admin/photoReviewPanel.tsx):

- `GET /api/photos/pending` (`photoService.pendingReview`) lists every job in
  `beforePhotoPendingApproval` / `afterPhotoPendingApproval` with the photos for its
  current gate and the customer name.
- Each photo can be **Approved** or **Rejected** (with a reason). Approving the last
  pending photo advances the job; rejecting one bounces it back.
- Thumbnails link to the full image.

Gated by the `photos:approve` permission (admins).

---

## 5. API

| Method | Path                      | R   | Purpose                                    |
| ------ | ------------------------- | --- | ------------------------------------------ |
| POST   | `/api/photos/presign`     | T   | Get a presigned PUT URL (no record yet)    |
| POST   | `/api/photos/confirm`     | T   | Create the photo record after upload       |
| GET    | `/api/photos?job=:id`     | A,T | List a job's photos                        |
| GET    | `/api/photos/pending`     | A   | Jobs awaiting approval + their gate photos |
| POST   | `/api/photos/:id/approve` | A   | Approve a photo (advances the gate)        |
| POST   | `/api/photos/:id/reject`  | A   | Reject a photo with a reason               |

Validation: `presignPhotoSchema`, `confirmPhotoSchema`, `rejectPhotoSchema`
(`src/schemas/photoSchema.ts`). `contentType` is restricted to
`image/jpeg|png|webp|heic`.

---

## 6. Security & integrity

- **Ownership** — presign + confirm both require the job to be assigned to the
  calling technician.
- **Key scoping** — confirm rejects an `s3Key` that isn't under
  `jobs/<jobId>/<photoType>/`, so a client can't attach an arbitrary object.
- **Short-lived URLs** — presigned PUT URLs expire (`R2_PRESIGNED_EXPIRES_SECONDS`).
- **No orphans** — the DB row exists only after a confirmed upload, keeping gate
  counts and the approval queue truthful.

---

## 7. Notes & future work

- **Offline photos:** upload is online-only (streams to R2). For offline capture,
  buffer blobs in IndexedDB and upload on reconnect (larger change).
- **EXIF/orientation:** the canvas re-encode strips EXIF (incl. orientation);
  add orientation handling if portrait photos appear rotated on some devices.
- **HEIC:** Safari may produce HEIC; it's allowed and uploaded as-is when the
  browser can't decode it for compression.

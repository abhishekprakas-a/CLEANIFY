# Cleanify — Production Deployment Guide

How to take Cleanify from a fresh environment to live, seeding **only the super
admin** (no dummy data). The admin then creates workers, takes bookings, etc.

**Stack:** Next.js 14 (standalone build) · MongoDB Atlas · AWS S3 (before/after
photos) · JWT auth.

---

## 0. Prerequisites

- A **MongoDB Atlas** cluster (production tier).
- An **AWS S3** bucket for job photos + an IAM user with S3 access.
- A **host** for the Next.js app (ECS Fargate / App Runner / Amplify / any
  Node host). The build is `output: "standalone"`, so it containerizes cleanly.
- Node 20+ and this repo, to run the one-time seed.

---

## 1. Provision the database (MongoDB Atlas)

1. Create the cluster and a **database user** (username + password).
2. **Network Access:** allowlist the app host's egress IP(s). Also allowlist
   **your own IP** temporarily so you can run the seed from your machine.
3. Copy the **SRV connection string** → this becomes `MONGODB_URI`.
4. Pick a database name (e.g. `cleanify`) → `MONGODB_DB_NAME`.

Indexes are defined in the Mongoose models and **build automatically** on first
connect — nothing to create by hand.

---

## 2. Provision object storage (AWS S3)

The app uploads photos **directly from the browser** to S3 via presigned URLs,
and serves them by public URL.

1. Create the bucket (e.g. `cleanify`) in your region (e.g. `ap-south-1`).
2. **CORS** — required, or the browser upload fails with "Network error".
   Bucket → Permissions → CORS:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedOrigins": ["https://YOUR-LIVE-DOMAIN"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
3. **Public read** — so admins/workers can view photos. Turn off "Block all
   public access", then add a bucket policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadJobPhotos",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::cleanify/*"
       }
     ]
   }
   ```
   (For stricter privacy, keep the bucket private and serve via a CDN /
   presigned GETs — a small code change.)
4. **IAM user** for the app — needs at least `s3:PutObject` + `s3:GetObject` on
   `arn:aws:s3:::cleanify/*`. Create an **access key + secret** (these are S3
   credentials — a Cloudflare-style `cfat_` token will NOT work).

---

## 3. Configure environment variables

Set these in the host's config (or a local `.env` when running the seed).
**Never commit real secrets** — `.env` is gitignored; `.env.example` is the
template.

### Required
| Var | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | your live URL, e.g. `https://cleanify.example.com` |
| `MONGODB_URI` | Atlas SRV connection string |
| `MONGODB_DB_NAME` | e.g. `cleanify` |
| `JWT_SECRET` | **NEW** strong secret, **≥ 32 chars** (boot fails if shorter). Generate: `openssl rand -base64 48`. Don't reuse the dev value. |
| `S3_REGION` | e.g. `ap-south-1` |
| `S3_BUCKET` | e.g. `cleanify` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | the IAM user's S3 credentials |
| `S3_PUBLIC_BASE_URL` | `https://<bucket>.s3.<region>.amazonaws.com` |

### Super-admin seed (the one account created)
| Var | Notes |
|---|---|
| `SEED_ADMIN_NAME` | e.g. `Super Admin` |
| `SEED_ADMIN_EMAIL` | `cleanifycleaningservice88@gmail.com` |
| `SEED_ADMIN_PHONE` | `8848483892` |
| `SEED_ADMIN_PASSWORD` | **a strong password** — this is the first login |

### Optional
| Var | Notes |
|---|---|
| `S3_ENDPOINT` | leave **empty** for AWS S3 (set only for MinIO/S3-compatible) |
| `S3_FORCE_PATH_STYLE` | `false` for AWS |
| `S3_PRESIGNED_EXPIRES_SECONDS` | default `300` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | web-push keys (`npx web-push generate-vapid-keys`). Push (worker "New job assigned" alerts) stays off until both are set. |
| `VAPID_SUBJECT` | `mailto:cleanifycleaningservice88@gmail.com` |
| `NEXT_PUBLIC_APP_NAME` | defaults to `Cleanify` |

---

## 4. Seed the super admin (once)

The seed reads `MONGODB_URI` + `SEED_ADMIN_*` and creates **only** the RBAC
reference data and one admin account.

```bash
npm ci
npm run seed
```

Expected output: `Created admin: cleanifycleaningservice88@gmail.com` →
`Seed complete.`

- **Idempotent** — safe to re-run; re-running resets the admin password to the
  current `SEED_ADMIN_PASSWORD`.
- Creates **no** customers / bookings / jobs / technicians.

> 🚫 **Never run `npm run seed:demo` in production** — it **deletes** all
> customers, bookings, jobs, attendance, and reviews and inserts fake demo data.
> It is a local-development fixture only.

You can run the seed either from your machine (with the prod values in `.env`
and your IP allowlisted in Atlas) or as a one-off task in the deploy environment
with the prod env vars set.

---

## 5. Build & deploy the app

```bash
npm ci
npm run build      # produces the standalone server in .next/standalone
```

Deploy options (pick one):
- **Docker → ECS Fargate / App Runner** — copy `.next/standalone`,
  `.next/static`, and `public/` into the image; start `node server.js`.
- **AWS Amplify Hosting** — connects the repo and builds Next.js directly.
- Any Node host that can run the standalone output.

Set **all** the env vars from step 3 in the host. Serve over **HTTPS** (secure
cookies + HSTS are enabled).

---

## 6. First run

1. Sign in at `/login` with `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`.
2. **Change the admin password.**
3. Add workers: **Staff → Add staff** (or let technicians self-register at
   `/signup` and approve them under **Approvals**).
4. Start operating: create a **Booking** (it auto-creates a Job), assign
   workers on the Job, and workers execute from their installable app.

---

## 7. Pre-launch checklist

- [ ] `JWT_SECRET` is a fresh ≥32-char secret (not the dev one).
- [ ] `MONGODB_URI` points at the prod Atlas cluster; app host IP allowlisted.
- [ ] S3 **CORS** allows your live domain; **public read** on; IAM key valid.
- [ ] `NEXT_PUBLIC_APP_URL` = your live HTTPS domain.
- [ ] `.env` is **not** committed (it's gitignored).
- [ ] Ran `npm run seed` (admin only) — **not** `seed:demo`.
- [ ] Admin password changed after first login.
- [ ] (Optional) VAPID keys set if you want push notifications.
- [ ] Quality gates pass: `npm run typecheck` && `npm run lint`.

---

## 8. Operations notes

- **Backups:** enable Atlas automated backups.
- **Logs:** the app logs errors server-side (generic messages to clients); wire
  the host's log drain as needed. `Logs/` and `*.log` are gitignored.
- **Sessions:** refresh-token sessions auto-expire via a TTL index — no cleanup
  job needed.
- **Scaling:** the in-memory rate limiter is per-instance; for multiple
  instances, back it with Redis (the interface is already abstracted).
- **Re-seeding the admin password:** update `SEED_ADMIN_PASSWORD` and re-run
  `npm run seed` (safe/idempotent), or use the admin UI.

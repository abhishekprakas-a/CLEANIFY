# Environment Variable Guide

> Every environment variable the app reads, via the typed accessor
> [`src/lib/env.ts`](../src/lib/env.ts), which **fails fast at boot** if a required
> value is missing. Start from [`.env.example`](../.env.example).

Legend: **R** = required, **O** = optional (has a default or feature-gates off).

---

## Application

| Variable               | R/O | Default                       | Purpose                                                                     |
| ---------------------- | --- | ----------------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`             | O   | `development`                 | Standard Node env; `production` enables Secure cookies, disables debug logs |
| `NEXT_PUBLIC_APP_NAME` | O   | "Water Tank Cleaning Service" | Display name                                                                |
| `NEXT_PUBLIC_APP_URL`  | O   | `http://localhost:3000`       | Base URL (used in password-reset links)                                     |

## Database

| Variable          | R/O   | Purpose                                     |
| ----------------- | ----- | ------------------------------------------- |
| `MONGODB_URI`     | **R** | Mongoose connection string                  |
| `MONGODB_DB_NAME` | O     | Database name (default `waterTankCleaning`) |

## Authentication

| Variable                         | R/O   | Default        | Purpose                                                                              |
| -------------------------------- | ----- | -------------- | ------------------------------------------------------------------------------------ |
| `JWT_SECRET`                     | **R** | —              | Signs/verifies session JWTs. **Use a long random value** (`openssl rand -base64 48`) |
| `JWT_ACCESS_EXPIRES_IN`          | O     | `15m`          | Access-token lifetime                                                                |
| `AUTH_COOKIE_NAME`               | O     | `wtcs_token`   | Access cookie name                                                                   |
| `AUTH_REFRESH_COOKIE_NAME`       | O     | `wtcs_refresh` | Refresh cookie name                                                                  |
| `JWT_REFRESH_EXPIRES_IN_DAYS`    | O     | `7`            | Refresh/session lifetime                                                             |
| `JWT_REFRESH_REMEMBER_DAYS`      | O     | `30`           | Lifetime when "remember me" is checked                                               |
| `PASSWORD_RESET_EXPIRES_MINUTES` | O     | `30`           | Reset-link validity                                                                  |

## Object storage (Cloudflare R2)

| Variable                       | R/O | Purpose                                                        |
| ------------------------------ | --- | -------------------------------------------------------------- |
| `R2_ACCOUNT_ID`                | O\* | Account id (derives the endpoint if `R2_ENDPOINT` unset)       |
| `R2_ENDPOINT`                  | O\* | `https://<account>.r2.cloudflarestorage.com`                   |
| `R2_REGION`                    | O   | `auto`                                                         |
| `R2_BUCKET`                    | O\* | Bucket name                                                    |
| `R2_ACCESS_KEY_ID`             | O\* | R2 API token key                                               |
| `R2_SECRET_ACCESS_KEY`         | O\* | R2 API token secret                                            |
| `R2_PUBLIC_BASE_URL`           | O\* | Public/CDN base for saved photo URLs (r2.dev or custom domain) |
| `R2_PRESIGNED_EXPIRES_SECONDS` | O   | `300`                                                          |

\* Required **for photo uploads** to work; the app boots without them but uploads fail.

## Web Push (PWA notifications) — optional

| Variable                       | R/O | Purpose                                                    |
| ------------------------------ | --- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | O   | Public VAPID key (also read client-side)                   |
| `VAPID_PRIVATE_KEY`            | O   | Private VAPID key                                          |
| `VAPID_SUBJECT`                | O   | `mailto:` contact (default `mailto:admin@watertank.local`) |

Push is disabled until **both** VAPID keys are set; generate with
`npx web-push generate-vapid-keys`.

## Seeding (CLI only)

| Variable                                                                            | R/O | Purpose                                 |
| ----------------------------------------------------------------------------------- | --- | --------------------------------------- |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PHONE` / `SEED_ADMIN_PASSWORD` | O   | Initial admin created by `npm run seed` |

---

## Notes

- `NEXT_PUBLIC_*` variables are **exposed to the browser** — never put secrets
  there. Only the VAPID _public_ key and app name/URL use that prefix.
- Required vars (`MONGODB_URI`, `JWT_SECRET`) are validated at startup; a missing
  one throws a clear error rather than failing at first request.
- In Docker, build-time placeholders satisfy validation during `next build`; real
  values are injected at runtime (see [`deployment.md`](./deployment.md)).

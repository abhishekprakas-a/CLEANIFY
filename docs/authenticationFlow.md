# Authentication & Role Management

> JWT access tokens + rotating refresh tokens, persisted sessions, RBAC with a
> roles/permissions catalogue, and a secure password-reset flow. This document
> covers the model, the token lifecycle, route protection, and every endpoint.

---

## 1. Components at a glance

| Concern             | Implementation                                                          |
| ------------------- | ----------------------------------------------------------------------- |
| Password hashing    | bcrypt (`lib/password.ts`), `passwordHash` is `select:false`            |
| Access token        | Short-lived JWT (HS256, `jose`) in an httpOnly cookie — edge-verifiable |
| Refresh token       | Opaque, rotating, stored **hashed** in `sessionModel`                   |
| Session persistence | `sessionModel` rows (one per device/login), TTL-expired                 |
| RBAC                | `roleModel` + `permissionModel`; resolved per role, cached in-process   |
| Route protection    | `middleware.ts` (edge) + `lib/authGuard.ts` (server, defence in depth)  |
| Password reset      | One-time hashed token on the user, emailed link, all sessions revoked   |

---

## 2. Data model

```
userModel ──< sessionModel        (a user has many active sessions/devices)
userModel.role ──→ roleModel.name (role name links the two)
roleModel.permissions[] ──→ permissionModel.key   (catalogue of permission keys)
```

- **`userModel`** — credentials (`passwordHash`), `role` (`admin` | `technician`),
  `status`, and the password-reset fields (`passwordResetTokenHash`,
  `passwordResetExpiresAt`, both `select:false`).
- **`roleModel`** — `{ name, description, permissions: string[], isSystem }`. The two
  system roles are seeded with their default permission sets.
- **`permissionModel`** — `{ key, description }` catalogue (e.g. `customers:write`).
- **`sessionModel`** — `{ user, tokenHash, userAgent, ip, expiresAt, lastUsedAt,
revokedAt }`. A TTL index drops rows after `expiresAt`.

Permission keys and the default role→permission map live in
[`src/constants/permissions.ts`](../src/constants/permissions.ts) — the single
source of truth used both to **seed** the DB and as a **fallback** before seeding.

---

## 3. Tokens

### Access token (JWT)

- Payload: `{ sub, name, email, role, sid }` where `sid` is the session id.
- Lifetime: `JWT_ACCESS_EXPIRES_IN` (default 15m).
- Stored in the **`wtcs_token`** httpOnly cookie (`path=/`). Verified by the edge
  middleware on every protected request — no DB hit.

### Refresh token (opaque, rotating)

- Format: `"<sessionId>.<secret>"`. Only `sha256(secret)` is stored
  (`sessionModel.tokenHash`); the raw token is never persisted.
- Stored in the **`wtcs_refresh`** httpOnly cookie scoped to `path=/api/auth`, so
  it is only sent to the auth endpoints.
- Lifetime: `JWT_REFRESH_EXPIRES_IN_DAYS` (default 7), or
  `JWT_REFRESH_REMEMBER_DAYS` (default 30) when "remember me" is checked.
- **Rotation:** every refresh issues a new secret and updates the session row.
  A presented-but-mismatched token (reuse/theft) **revokes** the session.

---

## 4. Flows

### Login

```
POST /api/auth/login { email, password, remember? }
  1. Verify user is active + bcrypt password matches.
  2. sessionService.create() → new sessionModel row, returns raw refresh token.
  3. signAccessToken({ sub, role, …, sid }).
  4. Set-Cookie wtcs_token (access) + wtcs_refresh (refresh).
  5. 200 { user: { …, permissions } }
```

### Authenticated request

```
Browser → (cookie wtcs_token) → middleware verifies JWT + role group
        → route handler: requireRole()/requirePermission() re-checks → service
```

### Silent refresh (access token expired)

```
Any API call → 401
  client useApi() → POST /api/auth/refresh   (sends wtcs_refresh cookie)
      sessionService.rotate(): validate + rotate refresh, issue new access token
      Set-Cookie new wtcs_token + wtcs_refresh
  client retries the original request once
```

The refresh is de-duplicated client-side, so concurrent 401s trigger a single
refresh. On refresh failure the cookies are cleared and the user is sent to login.

### Logout

```
POST /api/auth/logout
  → sessionService.revoke(sid)  (sets revokedAt)
  → clear both cookies
```

### Forgot password

```
POST /api/auth/forgotPassword { email }
  → if active user: generate one-time token, store sha256(token) + expiry,
    email the link  <appUrl>/resetPassword?token=<raw>
  → always 200 (no account enumeration)
```

No email provider is wired up yet; in development `lib/mailer.ts` logs the link to
the server console. Swap its body for SES/Resend/SMTP in production.

### Reset password

```
POST /api/auth/resetPassword { token, password, confirmPassword }
  → look up user by sha256(token), check not expired
  → set new bcrypt passwordHash, clear reset fields
  → revoke ALL sessions for the user (force re-login everywhere)
```

---

## 5. Role-based access control

Three enforcement layers, coarse → fine:

1. **Edge middleware** (`middleware.ts`) — maps route groups to roles
   (`/dashboard`, `/customers`, … → admin; `/technician/*` → technician). Page
   requests redirect to `/login`; API requests get `401`/`403`. Fast, no DB.
2. **Role guard** (`requireRole([...])`) — re-checks the role inside the handler.
3. **Permission guard** (`requirePermission("customers:write")`) — fine-grained,
   resolved against `roleModel` via `roleService.getPermissions()` (cached).

> Middleware can be bypassed by misconfiguration, so handlers **always** re-assert
> with `requireRole`/`requirePermission`. Never trust the edge alone.

### Default permissions

| Role         | Permissions                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `admin`      | All permissions in the catalogue                                                                               |
| `technician` | `jobs:read:assigned`, `jobs:transition`, `photos:read`, `photos:upload`, `attendance:read`, `attendance:write` |

Roles are editable in the DB; the constants map is the seed + fallback.

---

## 6. Endpoints

| Method     | Path                       | Auth           | Purpose                                  |
| ---------- | -------------------------- | -------------- | ---------------------------------------- |
| POST       | `/api/auth/login`          | public         | Authenticate, open session, set cookies  |
| POST       | `/api/auth/refresh`        | refresh cookie | Rotate refresh + issue new access token  |
| POST       | `/api/auth/logout`         | session        | Revoke session, clear cookies            |
| GET        | `/api/auth/me`             | access         | Current user + resolved permissions      |
| POST       | `/api/auth/forgotPassword` | public         | Email a reset link (always 200)          |
| POST       | `/api/auth/resetPassword`  | public         | Set a new password via token             |
| GET / POST | `/api/users`               | admin          | List / create staff (admin + technician) |

The public auth endpoints are excluded from the middleware matcher so they are
reachable without a valid access token.

---

## 7. Security properties

- Passwords: bcrypt, `select:false`, never logged or serialised.
- Tokens: access JWT is short-lived; refresh is opaque, **single-use (rotating)**,
  stored only as a hash; reuse triggers session revocation.
- Cookies: `httpOnly`, `secure` in production, `SameSite=Lax`; refresh cookie is
  path-scoped to `/api/auth`. No token is ever exposed to JavaScript.
- Password reset: one-time hashed token with short expiry, no user enumeration,
  and full session revocation on completion.
- Defence in depth: edge gate + per-handler role/permission re-checks.

---

## 8. Client integration

- `store/authStore` holds the authenticated user (incl. `permissions`) and a
  `hasPermission(key)` selector for conditional UI.
- `hooks/useAuth` hydrates the store from `/api/auth/me`.
- `hooks/useApi` performs the transparent refresh-and-retry on `401`.

---

## 9. Known constraint (SSR)

React Server Components cannot set cookies during render, so the **silent refresh
runs on the client** (`useApi`). If a user returns after the access token has
expired, the first SSR page load sees no valid access cookie and redirects to
`/login`; the refresh cookie still enables immediate re-login. For seamless SSR
refresh, move the refresh into `middleware.ts` backed by an edge-compatible
session store — deliberately out of scope here to keep the data layer on Mongoose.

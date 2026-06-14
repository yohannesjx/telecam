# School Camera Platform — Architecture

## Service boundaries

The School Camera Platform is a **separate backend service** inside the SupaBank monorepo. It is not merged into the main `backend/` and must not be.

```
supabank/
├── backend/                  ← Super App core: auth, wallet, ledger, payments, merchants
├── superapp/                 ← Flutter Super App
├── admin-web/                ← Super App admin
├── school/
│   ├── backend/              ← School Camera backend (separate service, separate DB)
│   ├── admin-dashboard/      ← School Camera admin (Next.js)
│   ├── gateway-agent/        ← Reserved: future mini-PC gateway agent
│   └── docs/                 ← This folder
├── map_backend/
├── map_dashboard/
├── miniapps/
└── speaker/
```

## Why two separate backends

| Concern | Super App `backend/` | School Camera `school/backend/` |
|---------|---------------------|--------------------------------|
| Users / auth / wallet | Source of truth | Not present |
| Payments / ledger | Source of truth (TigerBeetle) | Not present (future: callback only) |
| Schools / classrooms / children | Not present | Source of truth |
| Cameras / RTSP / HLS | Not present | Source of truth |
| Parent–camera permissions | Not present | Source of truth |
| Subscriptions (school-level) | Not present | Source of truth |
| School admin ops | Not present | Source of truth |

Merging them would violate the principle of least privilege: the School Camera service would gain unnecessary access to wallet and ledger internals, and the Super App would need to understand camera streaming and NVR concepts.

## Security rules (non-negotiable)

- Parents **never** connect directly to NVR/cameras.
- RTSP URLs are **never** exposed publicly or logged.
- Signed HLS URLs are **never** logged.
- Only the `stream-worker` reaches NVR/cameras, over a private VPN tunnel (Tailscale or WireGuard).
- Object storage (MinIO / Cloudflare R2) is **private**; all playback uses presigned URLs only.

## Future integration plan

The old standalone Flutter parent app has been removed. A native Flutter module will be added inside `superapp/lib/features/school_camera/` (not a WebView mini-app). Integration across the two backends will work as follows:

```
┌─────────────────────────────────────────────────────────┐
│  Super App (Flutter)                                    │
│  superapp/lib/features/school_camera/                   │
└───────────────┬──────────────────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
Super App backend    School Camera backend
(auth / wallet)      (cameras / HLS / subs)
```

### Integration points (future phases — not implemented yet)

1. **User identity** — Parent logs in through the Super App. The Super App backend issues the JWT. The School Camera backend will accept a token issued (or validated) by the Super App rather than maintaining a separate login.

2. **Parent invitation / link code** — A school admin generates an invite code in the School Camera admin dashboard. The parent redeems it inside the Super App, which calls the School Camera backend to create the parent–child link.

3. **Parent–camera permissions** — Managed entirely in the School Camera backend (`parent_children`, `classrooms`, `cameras`). The Super App Flutter module queries these via the School Camera API using the parent's identity token.

4. **Payment confirmation** — When a parent needs to pay for a subscription:
   - The Super App Flutter native UI handles payment confirmation (PIN/biometric, wallet deduction via the Super App backend → TigerBeetle).
   - On success, the Super App backend calls the School Camera backend subscription activation endpoint.
   - The School Camera backend sets `subscriptions.status = ACTIVE`.
   - Money movement never happens inside the School Camera backend.

5. **Subscription activation** — Triggered by the Super App payment callback. The School Camera backend controls playback access (`ACTIVE` / `TRIAL` subscription check).

## What is NOT in scope yet

- Auth token federation between Super App and School Camera backends.
- Parent invitation/link code flow.
- Super App wallet → School Camera subscription payment callback.
- Flutter `superapp/lib/features/school_camera/` module.
- Any changes to main `backend/` business logic.

## Phase 3A — Parent Linking Database Foundation

### New tables (migration 000015)

**`parent_superapp_links`** — permanent record of a confirmed link between a School parent (`users.role = 'PARENT'`) and a Super App user ID.

| Column | Notes |
|--------|-------|
| `parent_id` | FK → `users(id)` — must be a School parent |
| `super_app_user_id` | UUID from the Super App backend; no FK (cross-service boundary) |
| `school_id` | FK → `schools(id)` |
| `status` | `active` \| `revoked` |
| Unique constraints | one link per parent; one Super App user per school |

**`parent_invitation_codes`** — one-time admin-generated codes used to establish a link.

| Column | Notes |
|--------|-------|
| `code_hash` | HMAC-SHA256 of raw code — raw code is **never stored** |
| `code_prefix` | First 8 chars of formatted code (safe to display) |
| `status` | `active` \| `used` \| `revoked` \| `expired` |
| `expires_at` | 7 days from generation |
| `used_by_super_app_user_id` | Populated on redemption (Phase 3C) |

### Security invariants

- Raw Parent Code shown **once** in the admin API response and never again.
- Only `code_hash` (HMAC-SHA256) and `code_prefix` are stored in the database.
- Any existing active code for the same parent+school is revoked when a new one is generated.
- `PARENT_CODE_HMAC_SECRET` env var provides the HMAC key; production startup fails if unset.

---

## Phase 3B — Admin API for Parent Invitation Codes

### Admin endpoints (Phase 3B)

| Method | Path | Who |
|--------|------|-----|
| `POST` | `/admin/parents/:parent_id/invitation-code` | SUPER_ADMIN, SCHOOL_ADMIN (own school only) |
| `GET` | `/admin/parents/:parent_id/invitation-codes` | SUPER_ADMIN, SCHOOL_ADMIN (own school only) |
| `POST` | `/admin/parents/:parent_id/invitation-codes/:code_id/revoke` | SUPER_ADMIN, SCHOOL_ADMIN (own school only) |
| `GET` | `/admin/schools/:school_id/parent-links` | SUPER_ADMIN, SCHOOL_ADMIN (own school only) |

### Generate code flow

1. Admin calls `POST /admin/parents/:parent_id/invitation-code` with `{ "school_id": "..." }`.
2. Any existing active code for that parent+school is revoked first.
3. New code is generated via `crypto/rand` → 6-digit numeric code (e.g. `493827`).
4. HMAC-SHA256 hash stored in DB; raw code returned once in the response.
5. Code expires in 7 days.

### RBAC

- `SUPER_ADMIN` — unrestricted access to all schools.
- `SCHOOL_ADMIN` — restricted to schools they are assigned to.
- `TECHNICIAN` / `PARENT` — no access to invitation code endpoints.

### What is NOT done in Phase 3B

- Parent self-linking endpoint (`POST /parent/superapp/link`) — Phase 3C.
- `GET /parent/superapp/status` still returns `linked: false` — Phase 3C updates it.
- Payment integration — out of scope.

---

## Phase 2 — Super App Auth Bridge

Parents authenticated via the Super App can now call the School Camera backend
without a separate School Camera login.

### How it works

```
Flutter (Super App JWT)
    │
    ▼
School Camera backend (/parent/superapp/*)
    │  POST /internal/auth/introspect
    │  X-Internal-Token: <shared secret>
    ▼
Super App backend  →  verifies RS256 JWT  →  returns {active, user_id, phone}
```

### Endpoints added (Phase 2)

| Service | Endpoint | Auth |
|---------|----------|------|
| Super App backend | `POST /internal/auth/introspect` | `X-Internal-Token` header |
| School Camera backend | `GET /parent/superapp/status` | Super App bearer token |

### New environment variables

**Super App backend (`backend/`):**

| Variable | Required | Description |
|----------|----------|-------------|
| `INTERNAL_API_TOKEN` | production | Shared secret validated by `X-Internal-Token` header on `/internal/*` routes. Endpoint rejects all callers when empty. |

**School Camera backend (`school/backend/`):**

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPERAPP_BACKEND_URL` | when bridge enabled | Base URL of the Super App backend (no trailing slash). When empty, `/parent/superapp/*` routes are not registered. |
| `SUPERAPP_INTERNAL_TOKEN` | when bridge enabled | Shared secret sent as `X-Internal-Token` to the Super App introspect endpoint. |

### What is NOT done in Phase 2

- No parent–super_app_user link table. `GET /parent/superapp/status` returns `linked: false`.
- No payment integration.
- No Flutter School Camera module.
- Existing school parent auth (HMAC-SHA256 JWT) is unchanged — still required for all existing `/parent/*` routes.

---

## Current status

### Phase 0 / Phase 1 (complete — 2026-06-14)

- School Camera backend is at `school/backend/` (separate Go module, separate Docker Compose stack).
- School Camera admin dashboard is at `school/admin-dashboard/` (Next.js, separate deployment).
- Both continue to operate independently.

### Phase 2 (complete — 2026-06-14)

- Super App backend exposes `POST /internal/auth/introspect` (machine-to-machine, `X-Internal-Token` protected).
- School Camera backend can validate Super App parent tokens via HTTP introspection.

### Phase 3A (complete — 2026-06-14)

- DB tables `parent_superapp_links` and `parent_invitation_codes` added (migration 000015).
- SQLC queries generated for both tables.

### Phase 3B (complete — 2026-06-14)

Admin endpoints for parent invitation codes:

| Method | Path | Who |
|--------|------|-----|
| `POST` | `/admin/parents/:parent_id/invitation-code` | SUPER_ADMIN, SCHOOL_ADMIN (own school) |
| `GET` | `/admin/parents/:parent_id/invitation-codes` | SUPER_ADMIN, SCHOOL_ADMIN (own school) |
| `POST` | `/admin/parents/:parent_id/invitation-codes/:code_id/revoke` | SUPER_ADMIN, SCHOOL_ADMIN (own school) |
| `GET` | `/admin/schools/:school_id/parent-links` | SUPER_ADMIN, SCHOOL_ADMIN (own school) |

Raw codes are returned once in the generate response and never stored. Only `code_hash` (HMAC-SHA256) and `code_prefix` are persisted.

### Phase 3C (complete — 2026-06-14)

Parent self-link endpoint:

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/parent/superapp/link` | Super App bearer token |

Flow: client submits raw code → backend normalizes (trim + uppercase) → HMAC-SHA256 hash → lookup by hash → validate status/expiry → check duplicate links → atomic transaction (create link + mark code used) → return link record. Raw code never stored or logged.

Error codes returned as `"code"` field in JSON response:

| Code | HTTP | Meaning |
|------|------|---------|
| `PARENT_CODE_INVALID` | 422 | Code not found, revoked, or otherwise invalid |
| `PARENT_CODE_EXPIRED` | 422 | Code exists but is past its `expires_at` |
| `PARENT_CODE_ALREADY_USED` | 409 | Code was already redeemed |
| `PARENT_ALREADY_LINKED` | 409 | Parent already has an active link |
| `SUPERAPP_USER_ALREADY_LINKED` | 409 | Super App user already linked to a parent at this school |

### Phase 3D (complete — 2026-06-14)

`GET /parent/superapp/status` now queries `parent_superapp_links`:

- Not linked: `{"linked": false, "super_app_user_id": "..."}`
- Linked: `{"linked": true, "link_id": "...", "parent_id": "...", "school_id": "...", "parent_name": "...", "status": "active"}`

### Phase 4 (complete — 2026-06-14)

#### `GET /parent/superapp/classes`

Auth: Super App bearer token (validated via `RequireSuperAppUser` middleware).
Additional requirement: caller must have an active `parent_superapp_links` record.

Returns the children, classrooms, and cameras visible to the linked School parent.

**Response shape:**
```json
{
  "children": [
    {
      "child_id": "uuid",
      "child_name": "Abel",
      "classroom_id": "uuid",
      "classroom_name": "KG 2 Blue",
      "school_id": "uuid",
      "school_name": "Bright Future School",
      "cameras": [
        {
          "camera_id": "uuid",
          "label": "KG 2 Blue Classroom",
          "status": "online",
          "live_available": true,
          "default_quality": "sd_360p"
        }
      ]
    }
  ]
}
```

**Error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `SUPERAPP_AUTH_REQUIRED` | 401 | Missing or invalid Super App bearer token |
| `PARENT_LINK_REQUIRED` | 403 | Authenticated but no active parent link — call `POST /parent/superapp/link` first |

**Security guarantees:**
- `encrypted_rtsp_url`, `r2_live_path`, `r2_recording_path` are never selected.
- No signed HLS URLs or stream keys are returned.
- Parent can only see their own children — the parent_id comes from the verified link, never from a client-supplied parameter.
- Live playback URLs are NOT returned in this phase; they come in Phase 5.

**`status` / `live_available` derivation:**
- `cameras.status = 'ACTIVE'` → `"online"`, `live_available: true`
- `cameras.status = 'OFFLINE'` → `"offline"`, `live_available: false`
- any other value → `"unknown"`, `live_available: false`

### Phase 5 (complete — 2026-06-14)

#### `GET /parent/superapp/cameras/:camera_id/live`

Auth: Super App bearer token (validated via `RequireSuperAppUser` middleware).
Additional requirement: caller must have an active `parent_superapp_links` record.

Returns a signed live HLS URL for the camera. Performs the same authorization
checks as the legacy `/parent/cameras/:camera_id/live` endpoint, adapted for
Super App parents (no device record required).

**Trial subscription**: Created automatically when a parent redeems an
invitation code via `POST /parent/superapp/link` and has no active
subscription. Duration controlled by `PARENT_TRIAL_DAYS` env var (default: 5).

**Authorization chain:**
1. Resolve active `parent_superapp_links` record → `PARENT_LINK_REQUIRED` (403)
2. Camera + school + classroom `ACTIVE` status checks → `ACCESS_DENIED` (403)
3. Camera must belong to the linked school → `ACCESS_DENIED` (403)
4. Parent must have a child in the camera's classroom → `ACCESS_DENIED` (403)
5. Active subscription or trial (`ACTIVE`/`TRIAL` with `ends_at > NOW()`) → `SUBSCRIPTION_REQUIRED` (403)
6. School schedule check → `LIVE_OUTSIDE_SCHOOL_HOURS` / `LIVE_TEMPORARILY_PAUSED` (409)
7. Live playlist exists in R2 → `recording_not_found` (404)

**Security guarantees:**
- `encrypted_rtsp_url` is never read or returned.
- Signed HLS URL is returned to the client but never written to any log.
- `parentID` and `schoolID` come from the verified link — never from client parameters.

**Error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `SUPERAPP_AUTH_REQUIRED` | 401 | Missing or invalid Super App bearer token |
| `PARENT_LINK_REQUIRED` | 403 | No active parent link — call `POST /parent/superapp/link` first |
| `SUBSCRIPTION_REQUIRED` | 403 | No active subscription or trial |
| `LIVE_OUTSIDE_SCHOOL_HOURS` | 409 | School schedule does not permit live now |
| `LIVE_TEMPORARILY_PAUSED` | 409 | Live stream is temporarily paused |

### Phase 6 (complete — 2026-06-14)

#### `GET /parent/superapp/billing`

Auth: Super App bearer token (validated via `RequireSuperAppUser` middleware).
Additional requirement: caller must have an active `parent_superapp_links` record.

Returns a billing summary for the linked parent+school. Does **not** perform
any payment. Super App wallet payment comes in a future phase.

**Response shape:**
```json
{
  "subscription": {
    "status": "trial",
    "starts_at": "2026-06-14T10:00:00Z",
    "ends_at": "2026-06-17T10:00:00Z",
    "trial_ends_at": "2026-06-17T10:00:00Z",
    "is_active": true
  },
  "billing": {
    "amount_due_minor": 50000,
    "currency": "ETB",
    "due_date": "2026-06-17T10:00:00Z",
    "can_pay": false
  },
  "payments": [
    {
      "id": "uuid",
      "amount_minor": 50000,
      "currency": "ETB",
      "method": "BANK_TRANSFER",
      "status": "approved",
      "paid_at": "2026-06-01T10:00:00Z",
      "reference": "REF-001",
      "created_at": "2026-06-01T09:00:00Z"
    }
  ],
  "invoices": [
    {
      "id": "uuid",
      "amount_minor": 50000,
      "currency": "ETB",
      "status": "paid",
      "due_date": "2026-06-01",
      "paid_at": "2026-06-01T10:00:00Z",
      "created_at": "2026-05-25T08:00:00Z"
    }
  ]
}
```

**Subscription status values:**

| API status | DB status | Condition | `is_active` |
|------------|-----------|-----------|-------------|
| `trial` | `TRIAL` | `ends_at` in the future | `true` |
| `active` | `ACTIVE` | `ends_at` in the future | `true` |
| `expired` | `TRIAL` or `ACTIVE` | `ends_at` in the past | `false` |
| `past_due` | `PAST_DUE` | — | `false` |
| `cancelled` | `CANCELLED` | — | `false` |
| `blocked` | `BLOCKED` | — | `false` |
| `none` | (no record) | — | `false` |

**`can_pay`**: `true` when no active subscription exists (status is `none`,
`expired`, `past_due`, `cancelled`, or `blocked`). `false` when `is_active: true`.

**Amount due**: Flat default from config (`SCHOOL_CAMERA_MONTHLY_AMOUNT_MINOR`,
default `50000`; `SCHOOL_CAMERA_CURRENCY`, default `ETB`). No per-school pricing
in this phase.

**SQLC queries added:**
- `ListPaymentsForParentSchool` — filters by `parent_id` AND `school_id`
- `ListInvoicesForParentSchool` — filters by `parent_id` AND `school_id`

**Error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `SUPERAPP_AUTH_REQUIRED` | 401 | Missing or invalid Super App bearer token |
| `PARENT_LINK_REQUIRED` | 403 | No active parent link — call `POST /parent/superapp/link` first |

**Security guarantees:**
- `parentID` and `schoolID` come from the verified link — never from request parameters.
- `proof_url`, `notes`, `approved_by`, `rejected_by` are never returned.
- No internal ledger IDs or secrets are exposed.
- Payment is **not** performed by this endpoint.

### Not yet implemented

- Super App wallet → School Camera subscription payment callback.
- Flutter `superapp/lib/features/school_camera/` module.

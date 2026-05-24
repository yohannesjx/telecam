# School Camera Admin Dashboard

Phase 10 — Billing and Subscriptions for manual subscription, payment, and invoice management.

**Backend API:** `NEXT_PUBLIC_API_BASE_URL` (default uses `/api/backend` proxy — see `.env.example`)

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- TanStack Query + Recharts
- Docker / Docker Compose

## Local development

```bash
cd admin-dashboard
cp .env.example .env.local
npm install
npm run dev -- -p 53000
```

**CORS:** The browser blocks direct calls from `http://localhost:53000` to `https://camera.iglooks.com/api` unless the API allows that origin. By default, `.env.example` uses a **same-origin proxy** (`/api/backend` → remote API) so login works without redeploying the backend.

To call the API directly instead, set in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=https://camera.iglooks.com/api
```

…and ensure the API has `CORS_ALLOWED_ORIGINS=http://localhost:53000,http://127.0.0.1:53000` (production must set this explicitly).

Open [http://localhost:53000/login](http://localhost:53000/login)

### Test accounts (backend seed / production)

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `admin123` | SUPER_ADMIN |
| `schooladmin@example.com` | `password123` | SCHOOL_ADMIN |

Parent accounts (`PARENT` role) are **blocked** from the dashboard after login.

## Phase 8 features

- School detail **Classrooms** tab — create, edit, search, disable classrooms
- School detail **Children** tab — create, edit, assign classroom, filter by classroom
- Optional routes: `/schools/[schoolId]/classrooms`, `/schools/[schoolId]/children`
- URL query: `?tab=children&classroomId=` for cross-tab navigation
- Backend: `full_name` for children; classroom notes stored as `age_group`

## Phase 7 features

- `/schools` — list, search, status filter (scoped by role)
- `/schools/new` — create school (SUPER_ADMIN only)
- `/schools/[schoolId]` — detail tabs: Overview, Classrooms, Children, Parents, Cameras, Billing, Alerts, Storage
- `/schools/[schoolId]/edit` — edit school (full for SUPER_ADMIN, limited contact/address for SCHOOL_ADMIN)
- School admin assignment and revenue share (SUPER_ADMIN)
- Reuses Phase 5 alerts and Phase 6 cameras on school tabs

## Phase 6 features

- `/cameras` — school selector, filters, camera table, create drawer
- `/schools/[schoolId]/cameras` — school-scoped camera list
- `/cameras/[cameraId]` — overview, configuration, health summary, stream state, danger zone
- `POST /admin/schools/:school_id/cameras`, `GET .../cameras`, `GET/PATCH /admin/cameras/:camera_id`
- `GET /admin/cameras/:camera_id/health`, `GET .../stream-state`
- Write-only RTSP field with validation and public IP warning
- Enable/disable with confirmation; SUPER_ADMIN and SCHOOL_ADMIN can manage (backend enforces)

## Phase 5 features

- `/alerts` — Alerts Center with summary cards, filters, table, and detail drawer
- `GET /admin/alerts`, `PATCH .../acknowledge`, `PATCH .../resolve`
- `GET /admin/alert-deliveries` (Telegram delivery status; SUPER_ADMIN only on backend)
- 20s polling, manual refresh, acknowledge/resolve with toast feedback
- Sanitized metadata display (no RTSP, tokens, or secrets)

## Phase 4 features

- `/camera-monitoring` — school selector, status summary cards, filterable camera table (15s polling)
- `/cameras/[cameraId]/health` — health detail, events, open alerts, scheduler context (10s polling)
- `GET /admin/schools` + `GET /admin/schools/:school_id/cameras/status`
- `GET /admin/cameras/:camera_id/health` + stream-state + scheduler status
- Status badges: Online, Offline, Stopped by schedule, No recent segment, Error, Disabled
- Technicians without school list access can enter a school UUID manually
- No RTSP URLs, signed playback URLs, or admin video preview

## Phase 3 features

- `GET /admin/dashboard` via authenticated `apiFetch`
- TanStack Query with 45s auto-refresh
- Metric cards: health score, cameras, alerts, parents, subscriptions, billing, playback, auth, storage, workers
- Frontend health score calculation (Good / Warning / Critical)
- Camera status overview (Recharts bar chart)
- Alerts summary with link to `/alerts`
- Worker health summary
- Loading skeletons and error state with retry

## Phase 2 features

- `POST /auth/login` with `device_name` + stable `device_fingerprint`
- `POST /auth/refresh` on load and every 10 minutes
- `GET /auth/me` after refresh
- `POST /auth/logout`
- Access token in memory; refresh token + user snapshot in `localStorage`
- Protected `/dashboard` (and future admin routes)
- `/login` redirects authenticated admins to `/dashboard`
- Topbar shows email, role badge, logout

## Docker

```bash
cd admin-dashboard
docker compose -f docker-compose.dashboard.yml up -d --build
curl -I http://127.0.0.1:53000
docker compose -f docker-compose.dashboard.yml down
```

Port: **127.0.0.1:53000 → 3000**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -- -p 53000` | Dev server |
| `npm run build` | Production build |
| `npm run start -- -p 53000` | Run production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |

## Auth layout

```
lib/auth/
  types.ts          # User, roles, API types
  storage.ts        # localStorage (refresh token, user)
  session-store.ts  # In-memory access token + refresh hooks
  auth-api.ts       # login / refresh / logout / me
  auth-context.tsx  # AuthProvider + useAuth
  guards.tsx        # RequireAuth, GuestOnly
lib/api.ts          # apiFetch with 401 refresh retry
```

## Security notes

- Passwords are never stored
- Tokens are never logged or shown in the UI
- Dashboard responses are not logged
- Local dev uses `/api/backend` proxy by default to avoid CORS; production admin URLs must be listed in API `CORS_ALLOWED_ORIGINS` if calling the API cross-origin

## Phase 11 — Audit Logs

- Route: `/audit-logs` (SUPER_ADMIN, SCHOOL_ADMIN)
- API: `GET /admin/audit-logs` with `school_id`, `user_id`, `camera_id`, `action`, `date_from`, `date_to`, `limit`, `offset`
- Metadata is sanitized client-side before display (tokens, secrets, RTSP/signed URLs masked)

## Phase 14 — UX polish

- Shared list controls: debounced search (`useDebouncedValue`), client pagination (`useClientPagination`), `ListPagination`, `ListFiltersPanel`, `ListEmptyState`
- Applied to schools, parents, cameras, alerts, billing (subscriptions/payments/invoices), with clear-filters and results counts

## Phase 13 — Role-based UI permissions

- Central matrix: `lib/auth/permissions.ts`
- Page guards: `RequirePermission` in `DashboardShell`, `AccessDenied` component
- Sidebar and action buttons filtered by `hasPermission` / `<Can>`
- 403 shows action message without logging out (401 refresh unchanged)

## Not in Phase 13

Backend role changes, user management UI, settings page implementation.

- Routes: `/system`, `/system/workers`, `/system/storage`, `/system/scheduler`, `/system/retention`
- APIs: workers, health summary, scheduler, retention, storage usage (with `?summary=true`)
- Roles: `SUPER_ADMIN` and `TECHNICIAN` (full); `SCHOOL_ADMIN` (health, scheduler, storage only — workers/retention return 403 from API)

## Not in Phase 12

Worker start/stop, manual retention runs, Cloudflare billing API, SSH/terminal.

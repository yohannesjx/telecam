# School Camera Platform

Local Docker stack for HLS live demo playback and PostgreSQL-backed domain data.

## Pipeline (Phase 1)

```
sample.mp4 → FFmpeg → HLS segments → MinIO → API signed URL → browser playback
```

The API **does not** proxy or stream video. It only returns presigned MinIO/S3 URLs.

## Prerequisites

- Docker & Docker Compose
- `ffmpeg` on the host (only for `make sample`; optional if you provide your own `samples/sample.mp4`)
- `curl` and `jq` (optional, for Makefile helpers)
- `sqlc` (optional, for regenerating query code): `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`

## Quick start

```bash
cp .env.example .env
make sample          # or place your own samples/sample.mp4
docker compose up --build
```

On first boot, Compose runs:

1. `migrate up` — applies `migrations/*.sql` via [golang-migrate](https://github.com/golang-migrate/migrate)
2. `migrate seed` — loads dev rows from `migrations/seeds/`
3. Starts `api`, workers, MinIO, etc.

Wait until `stream-worker` logs show `camera stream started` and HLS uploads (`uploaded` with `cameras/demo/live/...` keys).

### Fresh database (reset volumes)

If you previously ran Phase 1 with the old init SQL volume, reset Postgres:

```bash
docker compose down -v
docker compose up --build
```

## Verify endpoints

```bash
curl http://localhost:58081/health
curl http://localhost:58081/db/health
curl http://localhost:58081/demo/live
```

| Endpoint | Purpose |
|----------|---------|
| `GET /` | Service info JSON (`status`, `service`, `version`) |
| `GET /health` | API process health: `{"status":"healthy"}` (no DB check) |
| `GET /db/health` | PostgreSQL connectivity |
| `GET /demo/live` | Presigned HLS playlist URL |

### Reverse proxy

```bash
curl http://localhost:58080/api/health
curl http://localhost:58080/db/health
curl http://localhost:58080/demo/live
```

### MinIO console

[http://localhost:59001](http://localhost:59001) — credentials in `.env`.

## Database

### Connection URLs

**Inside Docker (services):**

```
postgres://school_camera_user:school_camera_pass@postgres:5432/school_camera?sslmode=disable
```

Set as `DATABASE_URL` in `.env`.

**From host (psql, GUI tools):**

```
postgres://school_camera_user:school_camera_pass@localhost:55432/school_camera?sslmode=disable
```

### Migrations

```bash
# Automatic on compose up, or manually:
docker compose run --rm migrate up
docker compose run --rm migrate down   # rolls back one version
docker compose exec api /app/migrate up
docker compose exec api /app/migrate seed
```

Makefile shortcuts:

```bash
make migrate-up
make migrate-seed
```

### Seed data (local dev)

Creates:

- Sunshine Kindergarten (school)
- Butterflies Room (classroom)
- Demo parent user (`parent@demo.local`)
- Alex Demo (child) linked to parent
- Demo camera with `r2_live_path = cameras/demo/live/sd_360p/index.m3u8` and `default_quality = sd_360p`

### sqlc

Schema: `sql/schema.sql`  
Queries: `sql/queries/*.sql`  
Generated code: `internal/database/sqlc/`

```bash
make sqlc
# or: cd sql && sqlc generate
```

## Architecture

| Service | Role |
|---------|------|
| `api` | Gin — health, db health, presigned playlist |
| `migrate` | One-shot golang-migrate + seed CLI |
| `stream-worker` | FFmpeg HLS + MinIO upload |
| `postgres` | Primary database |
| `redis` | Wired in API (future sessions/cache) |
| `minio` | S3-compatible object storage |
| `reverse-proxy` | Caddy — `/api/*` → API |
| `*-worker` | Placeholders |

### Core tables (Phase 2+)

`users`, `schools`, `classrooms`, `children`, `parent_children`, `cameras`, `camera_stream_states`, `subscriptions`, `payments`, `invoices`, `school_revenue_share`, `devices`, `recording_segments`, `storage_usage`, `audit_logs`, `worker_heartbeats`, `camera_health_events`, `alerts`, `alert_deliveries`, `refresh_tokens`

## Configuration

| Variable | Default |
|----------|---------|
| `API_PORT` | 58081 |
| `POSTGRES_HOST_PORT` | 55432 |
| `REDIS_HOST_PORT` | 56379 |
| `MINIO_API_HOST_PORT` | 59000 |
| `MINIO_CONSOLE_HOST_PORT` | 59001 |
| `REVERSE_PROXY_HOST_PORT` | 58080 |
| `DATABASE_URL` | see `.env.example` |

`S3_PUBLIC_ENDPOINT` must be reachable from your browser (default `http://localhost:59000`).

## Development

```bash
make tidy
make build
make logs
make health
make db-health
make demo
make down
```

## Project layout

```
apps/
  api/ migrate/ stream-worker/ …
internal/
  config/ storage/ hls/ database/sqlc/ auth/ audit/
migrations/          # golang-migrate SQL
migrations/seeds/    # dev seed SQL
sql/
  schema.sql queries/ sqlc.yaml
docker/
  Dockerfile.api caddy/ minio/
```

## Authentication (Phase 3)

Short-lived **JWT access tokens** (default 15 minutes) and long-lived **opaque refresh tokens** (default 30 days, stored hashed in PostgreSQL). Refresh tokens rotate on every `/auth/refresh` call.

### Seeded users

| Email | Password | Role |
|-------|----------|------|
| `parent@example.com` | `password123` | PARENT |
| `admin@example.com` | `admin123` | SUPER_ADMIN |
| `schooladmin@example.com` | `password123` | SCHOOL_ADMIN (assigned to Sunshine Kindergarten) |

### Test commands

Login (parent):

```bash
curl -X POST http://localhost:58081/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"parent@example.com",
    "password":"password123",
    "device_name":"Local Browser",
    "device_fingerprint":"local-dev-device-001"
  }'
```

Current user:

```bash
curl http://localhost:58081/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Refresh:

```bash
curl -X POST http://localhost:58081/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"REFRESH_TOKEN"}'
```

Logout:

```bash
curl -X POST http://localhost:58081/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"REFRESH_TOKEN"}'
```

Role-gated examples:

```bash
# admin@example.com / admin123 → access token
curl http://localhost:58081/admin/protected-test -H "Authorization: Bearer ACCESS_TOKEN"

# parent@example.com / password123 → access token
curl http://localhost:58081/parent/protected-test -H "Authorization: Bearer ACCESS_TOKEN"
```

### Auth environment variables

| Variable | Default |
|----------|---------|
| `JWT_ACCESS_SECRET` | (set in `.env`) |
| `JWT_ACCESS_TTL_MINUTES` | 15 |
| `REFRESH_TOKEN_TTL_DAYS` | 30 |
| `BCRYPT_COST` | 12 |
| `APP_ENCRYPTION_KEY` | 32-byte key, base64 (`openssl rand -base64 32`) |

## Admin management APIs (Phase 4)

All admin routes require `Authorization: Bearer ACCESS_TOKEN`. Responses use `{"data": ...}`; errors use `{"error": "message"}`.

**Roles:** `SUPER_ADMIN` manages all schools. `SCHOOL_ADMIN` only sees schools in `school_admins`. `PARENT` cannot call `/admin/*`. `TECHNICIAN` can list/view cameras (temporary: all schools until technician assignment exists).

### Example flow

Login as super admin:

```bash
curl -X POST http://localhost:58081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","device_name":"CLI","device_fingerprint":"admin-cli"}'
```

Create school:

```bash
curl -X POST http://localhost:58081/admin/schools \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bright Future Kindergarten","address":"Addis Ababa","phone":"+251911000000"}'
```

Create classroom (replace `SCHOOL_ID`):

```bash
curl -X POST http://localhost:58081/admin/schools/SCHOOL_ID/classrooms \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"KG 1A","age_group":"3-4"}'
```

Create child:

```bash
curl -X POST http://localhost:58081/admin/schools/SCHOOL_ID/children \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Child Name","classroom_id":"CLASSROOM_ID"}'
```

Create parent:

```bash
curl -X POST http://localhost:58081/admin/parents \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Parent Name","email":"parent2@example.com","phone":"+251...","password":"password123"}'
```

Assign parent to child:

```bash
curl -X POST http://localhost:58081/admin/children/CHILD_ID/parents \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parent_id":"PARENT_USER_ID","relationship":"Mother"}'
```

Create camera (RTSP encrypted at rest; never returned in API):

```bash
curl -X POST http://localhost:58081/admin/schools/SCHOOL_ID/cameras \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classroom_id":"CLASSROOM_ID",
    "name":"Classroom 1 Camera",
    "rtsp_url":"rtsp://user:pass@camera/stream",
    "r2_live_path":"cameras/{school_id}/{camera_id}/live/sd_360p/index.m3u8",
    "r2_recording_path":"cameras/school-id/camera-id/recordings/",
    "default_quality":"sd_360p"
  }'
```

Login as parent and list children / cameras:

```bash
curl -X POST http://localhost:58081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@example.com","password":"password123","device_name":"Phone","device_fingerprint":"parent-dev-001"}'

curl http://localhost:58081/parent/children -H "Authorization: Bearer ACCESS_TOKEN"
curl http://localhost:58081/parent/cameras -H "Authorization: Bearer ACCESS_TOKEN"
```

### Admin route summary

| Method | Path | Roles |
|--------|------|-------|
| POST | `/admin/schools` | SUPER_ADMIN |
| GET/PATCH | `/admin/schools`, `/admin/schools/:id` | SUPER_ADMIN, SCHOOL_ADMIN |
| POST/GET | `/admin/schools/:id/admins` | SUPER_ADMIN |
| POST/GET | `/admin/schools/:id/classrooms` | SUPER_ADMIN, SCHOOL_ADMIN |
| PATCH | `/admin/classrooms/:id` | SUPER_ADMIN, SCHOOL_ADMIN |
| POST/GET | `/admin/schools/:id/children` | SUPER_ADMIN, SCHOOL_ADMIN |
| PATCH | `/admin/children/:id` | SUPER_ADMIN, SCHOOL_ADMIN |
| POST/GET | `/admin/children/:id/parents` | SUPER_ADMIN, SCHOOL_ADMIN |
| POST | `/admin/parents` | SUPER_ADMIN, SCHOOL_ADMIN |
| GET | `/admin/parents` | SUPER_ADMIN |
| POST/PATCH | `/admin/schools/:id/cameras`, `/admin/cameras/:id` | manage: SUPER_ADMIN, SCHOOL_ADMIN |
| GET | `/admin/schools/:id/cameras`, `/admin/cameras/:id` | + TECHNICIAN |
| GET | `/parent/children`, `/parent/cameras` | PARENT |
| GET | `/parent/cameras/:id/live` | PARENT |
| GET | `/parent/cameras/:id/timeline` | PARENT |
| GET | `/parent/cameras/:id/playback` | PARENT |

## Protected parent playback (Phase 5)

The API never streams video. It checks permissions against the database, then returns **signed MinIO URLs** for HLS playlists.

`GET /demo/live` remains a public-style dev shortcut (unsigned presign flow from Phase 1).

### Authorization checks (live / timeline / playback)

- Parent role, ACTIVE user
- Camera, school, classroom ACTIVE
- Parent has a child in the camera’s classroom
- ACTIVE or TRIAL subscription for that school
- Live only: current time within school schedule (see below)
- Live only: `r2_live_path` object exists in MinIO

### Live view vs playback/timeline

**Live view** (`GET /parent/cameras/:camera_id/live`) is available **only during configured school hours** on recording weekdays. The API checks the school schedule (`SCHOOL_TIMEZONE`, `RECORDING_START_TIME`, `RECORDING_END_TIME`, `RECORDING_DAYS`) and `camera_stream_states.desired_state` from the scheduler-worker. Outside school hours or on weekends, live returns **409** with code `LIVE_OUTSIDE_SCHOOL_HOURS` (no signed URL).

Default schedule: **Monday–Friday, 08:30–16:30** in `Africa/Addis_Ababa`.

**Timeline** and **recording playback** are **not** blocked by the current clock. Parents can request previous recordings on weekends or outside school hours if:

- Authorization and subscription checks pass
- The requested date/range is valid (playback must still fall within school hours **for that calendar date**)
- Recording segments exist within retention (cloud default **7 days** via `RETENTION_RECORDING_DAYS`)

Example blocked live response:

```json
{
  "error": "live view is not available outside school hours",
  "code": "LIVE_OUTSIDE_SCHOOL_HOURS",
  "data": {
    "timezone": "Africa/Addis_Ababa",
    "recording_days": ["MON", "TUE", "WED", "THU", "FRI"],
    "recording_start_time": "08:30",
    "recording_end_time": "16:30",
    "next_live_available_at": "2026-05-25T05:30:00Z",
    "desired_state": "STOPPED",
    "stream_state_reason": "WEEKEND"
  }
}
```

Blocked live attempts are recorded in `audit_logs` as `PLAYBACK_ACCESS_DENIED` with reason `LIVE_OUTSIDE_SCHOOL_HOURS`.

### Example flow

```bash
# 1. Login
curl -X POST http://localhost:58081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@example.com","password":"password123","device_name":"Local Browser","device_fingerprint":"local-dev-device-001"}'

# 2. List allowed cameras
curl http://localhost:58081/parent/cameras \
  -H "Authorization: Bearer ACCESS_TOKEN"

# 3. Protected live (demo camera id from seed; optional ?quality=sd_360p or ?quality=low)
curl http://localhost:58081/parent/cameras/11111111-1111-1111-1111-111111111105/live \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Open signed_hls_url from the response in VLC or Safari

# 4. Timeline for a date (grouped blocks; optional raw segments)
curl "http://localhost:58081/parent/cameras/11111111-1111-1111-1111-111111111105/timeline?date=2026-05-23&quality=sd_360p" \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Optional raw 10s segments:
curl "http://localhost:58081/parent/cameras/11111111-1111-1111-1111-111111111105/timeline?date=2026-05-23&include_segments=true" \
  -H "Authorization: Bearer ACCESS_TOKEN"

# 5. Recording playback (weekday, within school hours Africa/Addis_Ababa)
curl "http://localhost:58081/parent/cameras/11111111-1111-1111-1111-111111111105/playback?start=2026-05-23T09:00:00%2B03:00&end=2026-05-23T09:10:00%2B03:00&quality=sd_360p" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Playback builds a temporary playlist at `temp-playback/{user_id}/{camera_id}/{timestamp}/index.m3u8` with presigned segment URLs, then returns a signed playlist URL.

### Playback environment variables

| Variable | Default |
|----------|---------|
| `LIVE_PLAYBACK_URL_TTL_MINUTES` | 3 |
| `RECORDING_PLAYBACK_URL_TTL_MINUTES` | 10 |
| `LIVE_DELAY_SECONDS` | 30 |
| `SCHOOL_TIMEZONE` | Africa/Addis_Ababa |
| `RECORDING_START_TIME` | 08:30 |
| `RECORDING_END_TIME` | 16:30 |
| `RECORDING_DAYS` | MON,TUE,WED,THU,FRI |
| `PLAYBACK_RATE_LIMIT_PER_MINUTE` | 60 |
| `TIMELINE_SEGMENT_GAP_SECONDS` | 30 |

Seed includes a TRIAL subscription for `parent@example.com` and sample `recording_segments` for timeline/playback tests.

## Stream worker (Phase 6)

The `stream-worker` service reads **active cameras from PostgreSQL**, generates HLS with FFmpeg, uploads playlists and segments to object storage (MinIO locally or Cloudflare R2 in production), inserts `recording_segments` rows, updates `cameras.last_segment_at`, and reports `worker_heartbeats`.

**Never commit `.env`** — copy from `.env.example` only.

### Modes

| `STREAM_WORKER_MODE` | Behavior |
|----------------------|----------|
| `demo` (default) | Cameras without `encrypted_rtsp_url` — loops `samples/sample.mp4` |
| `rtsp` | Cameras with encrypted RTSP URL only (decrypted inside worker) |
| `mixed` | Demo file for cameras without RTSP; RTSP for cameras with credentials |

### Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `STORAGE_PROVIDER` | `minio` | `minio` or `r2` (both use S3 API) |
| `STREAM_WORKER_MODE` | `demo` | See table above |
| `STREAM_WORKER_POLL_SECONDS` | `15` | DB poll interval for camera list |
| `STREAM_WORKER_NAME` | `stream-worker-1` | Heartbeat identity |
| `STREAM_WORKER_MAX_RESTARTS` | `10` | Per-camera FFmpeg restart limit |
| `HLS_SEGMENT_SECONDS` | `10` | FFmpeg segment length |
| `LIVE_DELAY_SECONDS` | `30` | Rolling playlist window hint |
| `HLS_LOCAL_TMP_DIR` | `/tmp/hls` | Local FFmpeg scratch per camera |
| `DATABASE_URL` | — | Required in worker container |
| `APP_ENCRYPTION_KEY` | — | Required for `rtsp` / `mixed` RTSP cameras |

Object storage uses the same `S3_*` variables as the API. For **Cloudflare R2**, set `STORAGE_PROVIDER=r2` and point `S3_ENDPOINT` at your R2 S3 API host (see commented template in `.env.example`). Credentials stay in `.env` only.

### Run locally (demo mode)

```bash
cp .env.example .env   # if needed
# Ensure STREAM_WORKER_MODE=demo in .env
make sample
docker compose up --build
docker compose logs -f stream-worker
```

You should see JSON logs: `camera stream started`, `uploaded` with keys under `cameras/demo/live/sd_360p/`, and periodic heartbeats.

### Verify database writes

```bash
# Recording segments (new rows every ~10s while streaming)
docker compose exec postgres psql -U school_camera_user -d school_camera -c \
  "SELECT segment_path, start_time, size_bytes FROM recording_segments WHERE camera_id = '11111111-1111-1111-1111-111111111105' ORDER BY start_time DESC LIMIT 5;"

# Camera health timestamp
docker compose exec postgres psql -U school_camera_user -d school_camera -c \
  "SELECT name, last_segment_at FROM cameras WHERE id = '11111111-1111-1111-1111-111111111105';"

# Worker heartbeats
docker compose exec postgres psql -U school_camera_user -d school_camera -c \
  "SELECT worker_name, status, metadata, last_seen_at FROM worker_heartbeats ORDER BY last_seen_at DESC LIMIT 3;"
```

### Protected live (same stream as DB camera)

```bash
# Login, then:
curl http://localhost:58081/parent/cameras/11111111-1111-1111-1111-111111111105/live \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Uses `cameras.r2_live_path` (default quality playlist). `GET /demo/live` presigns the default `sd_360p` playlist for quick dev checks.

### Switch MinIO → R2 (production)

1. Create R2 bucket and API token.
2. Set in deployment env (not in git):

   ```
   STORAGE_PROVIDER=r2
   S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_PUBLIC_ENDPOINT=https://<your-public-domain>
   S3_BUCKET=<bucket>
   S3_REGION=auto
   S3_ACCESS_KEY=<key>
   S3_SECRET_KEY=<secret>
   S3_FORCE_PATH_STYLE=true
   ```

3. Rebuild/restart `api` and `stream-worker`.

RTSP URLs are never logged. Storage secrets are never logged.

## HLS quality profiles (Phase 7)

Supported live/recording qualities (defined in `internal/hls/profiles.go`):

| Profile | Resolution | Target video bitrate | Storage suffix |
|---------|------------|----------------------|----------------|
| `low_240p` | 426×240 | ~250 Kbps | `low_240p` |
| `sd_360p` (default) | 640×360 | ~450 Kbps | `sd_360p` |
| `sd_480p` | 854×480 | ~700 Kbps | `sd_480p` |

Audio is disabled by default (children/school use case).

### Storage layout

```
cameras/{school_id}/{camera_id}/live/{quality}/index.m3u8
cameras/{school_id}/{camera_id}/live/{quality}/segments/segment_00001.ts
```

Demo camera: `cameras/demo/live/sd_360p/index.m3u8`

**Phase 7 note:** The stream-worker generates **only** each camera’s `default_quality` profile. Simultaneous multi-quality transcoding per camera can be added later.

### Parent live with quality

```bash
# Default (camera.default_quality, usually sd_360p)
curl "http://localhost:58081/parent/cameras/CAMERA_ID/live" -H "Authorization: Bearer TOKEN"

# Explicit quality
curl "http://localhost:58081/parent/cameras/CAMERA_ID/live?quality=sd_360p" -H "Authorization: Bearer TOKEN"

# Aliases: low → low_240p, sd / medium → sd_360p
curl "http://localhost:58081/parent/cameras/CAMERA_ID/live?quality=low" -H "Authorization: Bearer TOKEN"
```

If the requested quality playlist is not in storage yet, the API **falls back** to `camera.default_quality` and sets `"fallback": true` in the response.

### Timeline and playback

Timeline returns **grouped blocks** (not hundreds of raw 10s rows). Omit `quality` to use the camera’s `default_quality`.

```bash
curl "http://localhost:58081/parent/cameras/CAMERA_ID/timeline?date=2026-05-23&quality=sd_360p" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:58081/parent/cameras/CAMERA_ID/playback?start=...&end=...&quality=sd_360p" \
  -H "Authorization: Bearer TOKEN"
```

### Admin cameras

`default_quality` must be one of `low_240p`, `sd_360p`, or `sd_480p` on create/update. Invalid values return `400`.

### After upgrading

```bash
docker compose run --rm migrate up
docker compose run --rm migrate-seed seed   # updates demo camera path
docker compose up -d --build stream-worker api
```

`GET /demo/live` continues to work and points at `cameras/demo/live/sd_360p/index.m3u8`.

## Stream worker hardening (Phase 8)

Production-oriented supervision for FFmpeg, uploads, and camera health.

### Capabilities

- Per-camera FFmpeg supervisor with exponential backoff (5s → 10s → 20s → 40s → 60s max)
- RTSP reconnect-friendly FFmpeg flags (`tcp`, timeouts); credentials never logged
- Upload retries with configurable backoff; `recording_segments` only after successful upload
- Camera `OFFLINE` detection when no segment upload within threshold; `ACTIVE` on recovery
- `camera_health_events` for stream lifecycle, FFmpeg, RTSP, upload, and offline/online
- Worker heartbeats: `RUNNING`, `DEGRADED`, `STOPPING` with detailed metadata
- Isolated temp dirs: `/tmp/hls/{camera_id}/{quality}/`
- Periodic stale temp cleanup; cleanup on shutdown
- Graceful shutdown: stop FFmpeg (SIGTERM → SIGKILL), flush heartbeat, remove temp dirs
- Camera config changes (quality, path, RTSP) trigger stream restart on next poll

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `STREAM_UPLOAD_MAX_RETRIES` | 5 | Upload attempts per object |
| `STREAM_UPLOAD_RETRY_BASE_SECONDS` | 2 | Upload retry backoff base |
| `CAMERA_OFFLINE_AFTER_SECONDS` | 120 | Mark camera OFFLINE without uploads |
| `STREAM_TEMP_CLEANUP_INTERVAL_SECONDS` | 300 | Temp file sweep interval |
| `STREAM_TEMP_MAX_AGE_MINUTES` | 30 | Delete local HLS files older than this |

### View health events

```bash
docker compose exec -T postgres psql -U school_camera_user -d school_camera -c \
  "SELECT event_type, severity, message, created_at FROM camera_health_events ORDER BY created_at DESC LIMIT 20;"
```

### Tail stream-worker logs

```bash
docker compose logs -f stream-worker
```

### Simulate failures

**MinIO down (upload retries / CAMERA_UPLOAD_FAILED):**

```bash
docker compose stop minio
docker compose logs -f stream-worker
docker compose start minio
```

**Disable a camera (stream stops on next poll):**

```bash
docker compose exec -T postgres psql -U school_camera_user -d school_camera -c \
  "UPDATE cameras SET status = 'DISABLED' WHERE id = '11111111-1111-1111-1111-111111111105';"
# Re-enable:
docker compose exec -T postgres psql -U school_camera_user -d school_camera -c \
  "UPDATE cameras SET status = 'ACTIVE' WHERE id = '11111111-1111-1111-1111-111111111105';"
```

### RTSP testing

For **production / Netcup** pilots over Tailscale, see [docs/school-connectivity.md](docs/school-connectivity.md) and run `./scripts/test-rtsp.sh` before adding cameras.

1. Set `STREAM_WORKER_MODE=mixed` (first real camera) or `rtsp` (all real cameras)
2. Ensure `APP_ENCRYPTION_KEY` matches the API
3. Create/update a camera with `rtsp_url` via admin API (stored encrypted; never returned in responses)
4. Set `r2_live_path` to `cameras/{school_id}/{camera_id}/live/sd_360p/index.m3u8`
5. Watch logs for `CAMERA_STREAM_STARTED` and uploads (no RTSP URL in output)

### Health event types

`CAMERA_STREAM_STARTED`, `CAMERA_STREAM_STOPPED`, `CAMERA_FFMPEG_EXITED`, `CAMERA_FFMPEG_RESTARTED`, `CAMERA_RTSP_CONNECT_FAILED`, `CAMERA_UPLOAD_FAILED`, `CAMERA_OFFLINE`, `CAMERA_ONLINE`, `CAMERA_MAX_RESTARTS_REACHED`

## Recording timeline blocks (Phase 9)

Raw `recording_segments` (~10s each) are merged into parent-friendly **blocks** for the timeline API.

### Grouping rule

Segments are sorted by `start_time`. Adjacent segments merge into one block when:

`next.start_time - previous.end_time <= TIMELINE_SEGMENT_GAP_SECONDS` (default **30**)

Example: segments at 08:30:00–08:30:10, 08:30:10–08:30:20, and 08:30:35–08:30:45 become one block **08:30:00–08:30:45** (15s gap ≤ 30s). A 31+ second gap starts a new block.

### Timeline response

```json
{
  "data": {
    "camera_id": "...",
    "camera_name": "Demo Camera",
    "date": "2026-05-23",
    "quality": "sd_360p",
    "timezone": "Africa/Addis_Ababa",
    "blocks": [
      {
        "start_time": "2026-05-23T08:30:00Z",
        "end_time": "2026-05-23T08:30:45Z",
        "duration_seconds": 45,
        "segment_count": 3
      }
    ],
    "total_segments": 3,
    "total_duration_seconds": 45
  }
}
```

No storage paths or RTSP data are exposed.

### Query parameters

| Param | Default | Notes |
|-------|---------|-------|
| `date` | required | `YYYY-MM-DD` in school timezone |
| `quality` | camera default | `sd_360p`, `low_240p`, aliases `low`, `sd` |
| `include_segments` | `false` | Set `true` to include raw segment list |

### Playback with gaps

Playback still returns a signed HLS URL built from available segments in the range. If the requested window has missing footage (gaps larger than `TIMELINE_SEGMENT_GAP_SECONDS`), the response includes:

```json
"warnings": ["Requested range contains missing recording gaps"],
"segment_count": 120
```

Temporary playlists use per-segment `EXTINF` durations, `#EXT-X-ENDLIST`, deduplicated segments, and the selected quality only.

### Example curls

```bash
# Grouped timeline
curl "http://localhost:58081/parent/cameras/11111111-1111-1111-1111-111111111105/timeline?date=2026-05-23&quality=sd_360p" \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Playback (may include warnings if range has gaps)
curl "http://localhost:58081/parent/cameras/11111111-1111-1111-1111-111111111105/playback?start=2026-05-23T09:00:00%2B03:00&end=2026-05-23T09:30:00%2B03:00&quality=sd_360p" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Database indexes

Migration `000005_recording_segments_timeline_indexes` adds:

- `(camera_id, quality, start_time)`
- `(camera_id, quality, expires_at)`

Apply with `docker compose run --rm migrate up`.

## Playback authorization hardening (Phase 10)

Parent live, timeline, and recording playback enforce a single authorization pipeline **before** any signed HLS URL is returned (timeline never returns signed URLs but uses the same checks).

### Checks (in order)

1. **JWT** — valid access token; role `PARENT`; user status `ACTIVE`; `device_id` claim required (re-login after deploy if using an old token).
2. **Device** — device belongs to the user; status `ACTIVE` (deny `BLOCKED` / `DISABLED`); `last_seen_at` updated on each playback request.
3. **Parent–child–camera** — parent linked to an active child in the camera’s classroom; school, classroom, and camera all `ACTIVE`.
4. **Subscription** — active or trial subscription for the school; `ends_at` must be null or in the future.
5. **Live** — live playlist object must exist in storage before signing (`LIVE_PLAYBACK_URL_TTL_MINUTES`, default 3).
6. **Recording** — range ≤ 1 hour, single school day, allowed weekday, within `RECORDING_START_TIME`–`RECORDING_END_TIME`; segments must exist (`RECORDING_PLAYBACK_URL_TTL_MINUTES`, default 10).

### API error responses (generic)

| HTTP | Message | When |
|------|---------|------|
| 403 | `access denied` | Auth, device, permission, subscription, schedule, or missing live playlist |
| 404 | `recording not found` | No segments for requested recording window |
| 429 | `rate limit exceeded` | Playback rate limit (`PLAYBACK_RATE_LIMIT_PER_MINUTE`) |

Internal denial reasons (e.g. `device_blocked`, `subscription_inactive_or_expired`) are written to audit logs only — not returned to clients.

### Audit actions

| Action | When |
|--------|------|
| `PLAYBACK_LIVE_REQUESTED` | Live URL issued |
| `PLAYBACK_TIMELINE_REQUESTED` | Timeline returned |
| `PLAYBACK_RECORDING_REQUESTED` | Recording URL issued |
| `PLAYBACK_ACCESS_DENIED` | Any denial (includes `denial_reason`, `device_id`, `child_id` when known) |

### Tests

```bash
go test ./internal/playback/...
```

## Health monitoring (Phase 11)

The `health-worker` service polls cameras, stream-worker heartbeats, upload/FFmpeg event rates, live playlist presence, and school-level availability. It writes `alerts` rows and optional `camera_health_events` (e.g. `CAMERA_NO_SEGMENT_UPLOADED`) without changing stream-worker behavior.

### Run

```bash
docker compose up -d --build health-worker api
```

Apply migration `000006_alerts` via `docker compose run --rm migrate up`.

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HEALTH_WORKER_NAME` | `health-worker-1` | Heartbeat identity (`HEALTH_WORKER` type) |
| `HEALTH_CHECK_INTERVAL_SECONDS` | `30` | Poll interval |
| `CAMERA_OFFLINE_ALERT_SECONDS` | `300` | `OFFLINE` status duration before alert |
| `SCHOOL_OFFLINE_ALERT_SECONDS` | `600` | All school cameras stale/offline |
| `NO_SEGMENT_ALERT_SECONDS` | `180` | No segment during recording hours |
| `PLAYLIST_STALE_ALERT_SECONDS` | `180` | Reserved for future LastModified checks |
| `UPLOAD_FAILURE_ALERT_COUNT` | `5` | `CAMERA_UPLOAD_FAILED` events in lookback |
| `FFMPEG_RESTART_ALERT_COUNT` | `5` | `CAMERA_FFMPEG_RESTARTED` events in lookback |
| `HEALTH_EVENT_LOOKBACK_MINUTES` | `10` | Spike detection window |
| `STREAM_WORKER_STALE_INTERVAL_MULTIPLIER` | `2` | Stale heartbeat = multiplier × check interval |

Uses the same `SCHOOL_TIMEZONE`, `RECORDING_*`, and `S3_*` settings as the API/stream-worker for schedule and playlist checks.

### Alert de-duplication

Before opening an alert, the worker checks for an existing `OPEN` or `ACKNOWLEDGED` row with the same `alert_type` and `camera_id` or `school_id`. Duplicates are not created; metadata is refreshed via `updated_at`. Recovery resolves alerts (status `RESOLVED`, `resolved_at` set) instead of deleting rows.

### Admin APIs

| Method | Path | Roles |
|--------|------|-------|
| GET | `/admin/alerts` | SUPER_ADMIN, SCHOOL_ADMIN, TECHNICIAN |
| PATCH | `/admin/alerts/:alert_id/acknowledge` | same |
| PATCH | `/admin/alerts/:alert_id/resolve` | same |
| GET | `/admin/health/summary` | same |
| GET | `/admin/cameras/:camera_id/health` | same |

`SCHOOL_ADMIN` only sees/alerts for assigned schools. Query params for alerts: `status`, `severity`, `school_id`, `camera_id`.

### Simulate camera offline

1. Stop stream-worker or block uploads so `cameras.status` becomes `OFFLINE` and `last_segment_at` stops updating.
2. Wait for `CAMERA_OFFLINE_ALERT_SECONDS` / `NO_SEGMENT_ALERT_SECONDS` (during recording hours).
3. List alerts: `GET /admin/alerts?status=OPEN`
4. Restart stream-worker; health-worker resolves alerts when segments/heartbeat resume.

```bash
# Open alerts (admin token)
curl "http://localhost:58081/admin/alerts?status=OPEN" -H "Authorization: Bearer TOKEN"

# Acknowledge
curl -X PATCH "http://localhost:58081/admin/alerts/ALERT_UUID/acknowledge" -H "Authorization: Bearer TOKEN"

# Health summary
curl "http://localhost:58081/admin/health/summary" -H "Authorization: Bearer TOKEN"
```

### Tests

```bash
go test ./internal/health/...
```

## Alert delivery (Phase 12)

The `alert-worker` service sends Telegram notifications for important alerts created by `health-worker`. Delivery attempts are tracked in `alert_deliveries` with de-duplication per `(alert_id, channel, recipient, delivery_kind)`.

### Telegram setup (BotFather)

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Run `/newbot`, follow prompts, and copy the **bot token** (keep it secret).
3. Add the bot to a group/channel or start a chat with it.
4. Obtain **chat ID**:
   - For a private chat: message [@userinfobot](https://t.me/userinfobot) or send a message to your bot and call  
     `https://api.telegram.org/bot<TOKEN>/getUpdates` — use `message.chat.id`.
   - For a group: add the bot, send a message, then read `chat.id` from `getUpdates` (often negative for groups).

### Enable locally

In `.env` (never commit real tokens):

```env
TELEGRAM_ALERTS_ENABLED=true
TELEGRAM_BOT_TOKEN=replace_me
TELEGRAM_CHAT_ID=replace_me
```

**Security:** Never commit `.env`. If a bot token was ever committed or shared, revoke it in [@BotFather](https://t.me/BotFather) (`/revoke`), generate a new token, and set it only in deploy-time secrets (server `.env`, not git).

Restart the worker:

```bash
docker compose up -d --build alert-worker
```

With `TELEGRAM_ALERTS_ENABLED=false` (default), the worker still runs, writes `ALERT_WORKER` heartbeats, and logs that delivery is disabled — it does not crash.

### What gets sent

| Severity | Sent when |
|----------|-----------|
| CRITICAL | Any open alert |
| WARNING | `CAMERA_FFMPEG_RESTART_SPIKE`, `CAMERA_UPLOAD_FAILURE_SPIKE`, `STREAM_WORKER_STALE` only |
| INFO | Skipped |

- **OPENED** — one Telegram message when an alert first qualifies (no duplicate if already `SENT`).
- **RESOLVED** — one message after resolve, only if the OPENED message was delivered.

Configure severities with `ALERT_SEND_SEVERITIES=CRITICAL,WARNING`.

### Test delivery

1. Apply migrations: `docker compose run --rm migrate up`
2. Ensure `health-worker` and `stream-worker` are running.
3. Stop `stream-worker` or block uploads until a CRITICAL alert appears (`GET /admin/alerts?status=OPEN`).
4. Confirm Telegram receives the alert; check deliveries:

```bash
curl "http://localhost:58081/admin/alert-deliveries" \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"
```

5. Restore the stream; when the alert resolves, you should receive a single resolved notification.

### Inspect deliveries (SQL)

```sql
SELECT id, alert_id, channel, delivery_kind, status, attempts, last_error, delivered_at
FROM alert_deliveries
ORDER BY created_at DESC
LIMIT 20;
```

### Admin API

| Method | Path | Roles |
|--------|------|-------|
| GET | `/admin/alert-deliveries` | SUPER_ADMIN |

Query params: `status`, `channel`, `alert_id`.

### Environment variables

| Variable | Default |
|----------|---------|
| `ALERT_WORKER_NAME` | `alert-worker-1` |
| `ALERT_WORKER_POLL_SECONDS` | `15` |
| `ALERT_DELIVERY_MAX_ATTEMPTS` | `5` |
| `ALERT_SEND_SEVERITIES` | `CRITICAL,WARNING` |
| `TELEGRAM_ALERTS_ENABLED` | `false` |
| `TELEGRAM_BOT_TOKEN` | (empty) |
| `TELEGRAM_CHAT_ID` | (empty) |

The bot token is never written to application logs.

### Tests

```bash
go test ./internal/alertdelivery/...
```

## Scheduler worker (Phase 13)

The `scheduler-worker` controls **when** cameras may stream. It does not run FFmpeg; it updates `camera_stream_states.desired_state`. The `stream-worker` only starts cameras where `desired_state = RUNNING`.

### Schedule (default)

| Setting | Default |
|---------|---------|
| Timezone | `Africa/Addis_Ababa` (GMT+3) |
| Days | Mon–Fri |
| Hours | 08:30–16:30 local |

Override with `SCHEDULER_*` env vars (falls back to `SCHOOL_TIMEZONE`, `RECORDING_START_TIME`, `RECORDING_END_TIME`, `RECORDING_DAYS`).

### States

| `desired_state` | Meaning |
|-----------------|--------|
| `RUNNING` | stream-worker may stream this camera |
| `STOPPED` | stream-worker stops / does not start |

| `reason` | Meaning |
|----------|---------|
| `WITHIN_SCHEDULE` | School hours on a recording day |
| `OUTSIDE_SCHEDULE` | Weekday but outside hours |
| `WEEKEND` | Non-recording day |
| `HOLIDAY` | Reserved for future `school_holidays` table |
| `MANUAL_OVERRIDE` | Reserved for admin force stop/run |

`cameras.status = DISABLED` excludes the camera from streaming regardless of schedule. `OFFLINE` cameras stay `RUNNING` during school hours so the stream-worker can recover.

### Run

```bash
docker compose run --rm migrate up
docker compose up -d --build scheduler-worker stream-worker api
```

### Verify

```bash
curl http://localhost:58081/admin/scheduler/status -H "Authorization: Bearer ADMIN_TOKEN"
curl http://localhost:58081/admin/cameras/CAMERA_ID/stream-state -H "Authorization: Bearer ADMIN_TOKEN"
```

```sql
SELECT camera_id, desired_state, reason, updated_at
FROM camera_stream_states
ORDER BY updated_at DESC;
```

### Simulate outside hours

Temporarily set in `.env` and restart `scheduler-worker`:

```env
SCHEDULER_RECORDING_START_TIME=23:59
SCHEDULER_RECORDING_END_TIME=23:58
```

Or set `SCHEDULER_RECORDING_DAYS=SUN` only to force `WEEKEND`/`STOPPED` on weekdays.

### Future placeholders

- **Manual override** — force `RUNNING`/`STOPPED` per camera (`MANUAL_OVERRIDE`)
- **Holidays** — planned `school_holidays` table (school-wide or per-date closures)

### Tests

```bash
go test ./internal/scheduler/...
```

## Retention worker (Phase 14)

The `retention-worker` cleans **cloud** HLS storage (MinIO / R2). It does **not** manage on-prem NVR retention (15–30 days on NVR is separate).

### What it does

1. **Expired recording segments** — `recording_segments` where `expires_at < now()` (stream-worker sets 7-day expiry). Deletes `segment_path` from object storage, then removes the DB row. Missing objects are treated as already deleted. Live playlists under `cameras/.../live/` are never deleted.
2. **Temp playback** — objects under `temp-playback/` older than `TEMP_PLAYBACK_RETENTION_MINUTES` (default 60).
3. **Storage usage** — daily per-school totals from non-expired segments into `storage_usage`.

### Environment variables

| Variable | Default |
|----------|---------|
| `RETENTION_WORKER_NAME` | `retention-worker-1` |
| `RETENTION_RUN_INTERVAL_MINUTES` | `60` |
| `RETENTION_BATCH_SIZE` | `1000` |
| `RETENTION_DRY_RUN` | `false` |
| `RETENTION_DELETE_OBJECTS` | `true` |
| `RETENTION_DELETE_DB_ROWS` | `true` |
| `RETENTION_RECORDING_DAYS` | `7` (documentation; expiry is on each segment row) |
| `TEMP_PLAYBACK_RETENTION_MINUTES` | `60` |
| `STORAGE_USAGE_REPORT_HOUR` | `23` |

### Dry-run

Set `RETENTION_DRY_RUN=true` to log actions without deleting objects or DB rows.

### Verify

```bash
docker compose up -d --build retention-worker

# Expired segments (should decrease after run)
docker compose exec postgres psql -U school_camera_user -d school_camera -c \
  "SELECT COUNT(*) FROM recording_segments WHERE expires_at < NOW();"

# Storage usage
curl "http://localhost:58081/admin/storage-usage?date_from=2026-05-24" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Retention worker heartbeat
curl http://localhost:58081/admin/retention/status \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"
```

R2 uses the same S3-compatible API as MinIO (`S3_*` env vars).

### Admin APIs

| Method | Path | Roles |
|--------|------|-------|
| GET | `/admin/storage-usage` | SUPER_ADMIN, SCHOOL_ADMIN |
| GET | `/admin/retention/status` | SUPER_ADMIN, TECHNICIAN |

### Tests

```bash
go test ./internal/retention/...
```

## Manual subscription & billing (Phase 15)

Phase 15 adds **manual** subscription and billing (no Telebirr gateway yet). Admins create invoices and payment records; approving a payment can activate or extend a subscription and mark a matching open invoice paid.

### Amount convention

All monetary fields use **minor units** (`amount_cents`). For ETB, 500 Birr = `50000` (100 cents per Birr).

### Subscription statuses

| Status | Playback |
|--------|----------|
| `ACTIVE`, `TRIAL` | Allowed (if `ends_at` is null or in the future) |
| `PAST_DUE`, `CANCELLED`, `BLOCKED` | Denied |

### Manual workflow

1. Admin creates an **invoice** for parent + school.
2. Parent pays offline (bank transfer, cash, Telebirr app, etc.).
3. Admin creates a **payment** record (`PENDING`).
4. Admin **approves** the payment → subscription may become `ACTIVE` (or extended 30 days); open invoice for that parent/school is marked `PAID`.
5. Parent playback works when subscription is `ACTIVE` or `TRIAL`.

Telebirr proof uploads and automatic gateway callbacks are **future work**.

### Database (migration `000010_billing`)

- `payments` — `CASH`, `BANK_TRANSFER`, `TELEBIRR`, `MANUAL` (admin bookkeeping); statuses `PENDING`, `APPROVED`, `REJECTED`, `REFUNDED`. **Chapa is not supported.**
- `invoices` — statuses `OPEN`, `PAID`, `VOID`, `OVERDUE`; `invoice_number` like `INV-20260524-000001`
- `school_revenue_share` — per-school percentage (default 25%)

### Admin APIs

Roles: `SUPER_ADMIN` and `SCHOOL_ADMIN` (school-scoped) unless noted.

| Method | Path | Notes |
|--------|------|--------|
| POST | `/admin/subscriptions` | Create; blocks duplicate active sub for same parent+school |
| GET | `/admin/subscriptions` | Query: `school_id`, `parent_id`, `status` |
| PATCH | `/admin/subscriptions/:id/status` | Audit: `SUBSCRIPTION_STATUS_UPDATED` |
| PATCH | `/admin/subscriptions/:id/extend` | Audit: `SUBSCRIPTION_EXTENDED` |
| POST | `/admin/payments` | Creates `PENDING` payment |
| GET | `/admin/payments` | Query: `school_id`, `parent_id`, `status`, `method` |
| PATCH | `/admin/payments/:id/approve` | Audit: `PAYMENT_APPROVED` |
| PATCH | `/admin/payments/:id/reject` | Audit: `PAYMENT_REJECTED` |
| POST | `/admin/invoices` | Audit: `INVOICE_CREATED` |
| GET | `/admin/invoices` | Query: `school_id`, `parent_id`, `status` |
| PATCH | `/admin/invoices/:id/mark-paid` | Audit: `INVOICE_MARKED_PAID` |
| PATCH | `/admin/invoices/:id/void` | Audit: `INVOICE_VOIDED` |
| POST | `/admin/schools/:school_id/revenue-share` | **SUPER_ADMIN only** |
| GET | `/admin/schools/:school_id/revenue-share` | Active share; `?history=true` for all rows |

### Parent APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/parent/subscriptions` | `PARENT` — `allowed_playback`, `days_remaining`, `payment_methods` (no Chapa) |
| GET | `/parent/payments` | `PARENT` |
| GET | `/parent/invoices` | `PARENT` |

### Example: create subscription (admin)

```bash
curl -s -X POST http://localhost:58081/admin/subscriptions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "'"$PARENT_ID"'",
    "school_id": "'"$SCHOOL_ID"'",
    "status": "TRIAL",
    "starts_at": "2026-05-23T00:00:00Z",
    "ends_at": "2026-06-30T23:59:59Z"
  }'
```

### Example: invoice → payment → approve

```bash
# Create invoice (500 ETB = 50000)
curl -s -X POST http://localhost:58081/admin/invoices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "'"$PARENT_ID"'",
    "school_id": "'"$SCHOOL_ID"'",
    "amount_cents": 50000,
    "currency": "ETB",
    "due_date": "2026-06-01"
  }'

# Record pending bank transfer
curl -s -X POST http://localhost:58081/admin/payments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "'"$PARENT_ID"'",
    "school_id": "'"$SCHOOL_ID"'",
    "subscription_id": "'"$SUBSCRIPTION_ID"'",
    "amount_cents": 50000,
    "method": "BANK_TRANSFER",
    "reference": "TXN123",
    "notes": "Manual bank transfer"
  }'

# Approve (activates/extends subscription, marks open invoice paid)
curl -s -X PATCH "http://localhost:58081/admin/payments/$PAYMENT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Example: parent subscription visibility

```bash
curl -s http://localhost:58081/parent/subscriptions \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

Example fields: `days_remaining` (null if no `ends_at`, `0` if expired), `payment_methods`: `["BANK_TRANSFER","TELEBIRR","CASH"]`. Parent payments use `payment_method` (not `method`).

### Tests

```bash
go test ./internal/billing/...
```

## Admin monitoring dashboard (Phase 16)

Consolidated operations APIs for schools, cameras, alerts, workers, storage, playback, auth, and billing visibility.

### Timezone

“Today” and monthly revenue use `SCHOOL_TIMEZONE` (default `Africa/Addis_Ababa`) for day boundaries. Revenue and pending payment amounts are returned in **ETB** (from `amount_cents` / 100).

### Performance and tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `DASHBOARD_CACHE_TTL_SECONDS` | `45` | Redis cache TTL for `GET /admin/dashboard` (per scope) |
| `WORKER_STALE_THRESHOLD_SECONDS` | `120` | Heartbeat age before worker status becomes `STALE` |
| `CAMERA_OFFLINE_AFTER_SECONDS` | `120` | Used for `system_health_score_percent` (recent segment) |

Dashboard responses include `system_health_score_percent` (% of cameras with recent segments among active+offline), `cameras_healthy`, and `cached: true` when served from Redis.

Camera status rows include `last_segment_age_minutes` and `stream_lag_seconds` (segment age minus `LIVE_DELAY_SECONDS`).

Playback stats include `unique_parents` (distinct parents with successful playback requests) overall and per day in `by_day`.

### Scoping

| Role | Dashboard / cameras status | Audit logs / playback stats | Workers |
|------|---------------------------|----------------------------|---------|
| `SUPER_ADMIN` | All schools | All schools | Yes |
| `SCHOOL_ADMIN` | Assigned schools only | Assigned schools only | No |
| `TECHNICIAN` | All schools (temporary) | No | Yes |

### Endpoints

| Method | Path | Roles |
|--------|------|--------|
| GET | `/admin/dashboard` | SUPER_ADMIN, SCHOOL_ADMIN, TECHNICIAN |
| GET | `/admin/schools/:school_id/cameras/status` | SUPER_ADMIN, SCHOOL_ADMIN, TECHNICIAN |
| GET | `/admin/cameras/:camera_id/health-history` | `?period=24h` or `7d` |
| GET | `/admin/audit-logs` | SUPER_ADMIN, SCHOOL_ADMIN |
| GET | `/admin/workers` | SUPER_ADMIN, TECHNICIAN |
| GET | `/admin/playback-stats` | SUPER_ADMIN, SCHOOL_ADMIN |
| GET | `/admin/alerts` | + pagination, `alert_type` filter |
| GET | `/admin/storage-usage` | + `?summary=true` for totals |

### Example: dashboard

```bash
curl -s http://localhost:58081/admin/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Example: playback stats

```bash
curl -s "http://localhost:58081/admin/playback-stats?date_from=2026-05-01&date_to=2026-05-24&group_by=day" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

`group_by`: `day` (default), `camera`, or `school`. Each `by_day` row includes `unique_parents`.

### Example: camera health history

```bash
curl -s "http://localhost:58081/admin/cameras/$CAMERA_ID/health-history?period=7d" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Example: audit logs

```bash
curl -s "http://localhost:58081/admin/audit-logs?school_id=$SCHOOL_ID&action=PLAYBACK_ACCESS_DENIED&limit=50&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Audit `metadata` is sanitized (no RTSP URLs, signed URLs, tokens, passwords, or storage paths).

### Tests

```bash
go test ./internal/monitoring/...
```

## Phase 16.2 — Critical security fixes (pre-deployment)

Addresses deployment blockers from the security audit (B-1, B-2, B-3, B-4, B-14).

### Secrets and Telegram

- **Never commit `.env`** — it is gitignored (`.env.*` ignored; `.env.example` is tracked).
- Use placeholders in docs only: `TELEGRAM_BOT_TOKEN=replace_me`.
- If a token was ever exposed: revoke in [BotFather](https://t.me/BotFather) (`/revoke`), create a new bot token, set only on the server.
- Bot tokens are **never** written to application logs.

### Caddy: local vs production

| Mode | Caddyfile | URL |
|------|-----------|-----|
| Local | `docker/caddy/Caddyfile.local` | `http://localhost:58080` (via `REVERSE_PROXY_HOST_PORT`) |
| Production | `docker/caddy/Caddyfile.production` | `https://your-domain` |

Production requirements:

- Set `APP_ENV=production`, `DOMAIN=camera.yourschool.et`, `CADDY_EMAIL=you@school.et`.
- Point DNS **A record** to your Netcup server IP.
- Mount `Caddyfile.production` and expose **80** and **443** only.
- Caddy obtains Let's Encrypt certificates automatically.

### Auth rate limiting (Redis)

Applied to `POST /auth/login` and `POST /auth/refresh` only.

| Limit | Default |
|-------|---------|
| Login per IP | 20 / minute |
| Login per email | 5 / 15 minutes |
| Refresh per IP | 60 / minute |
| Refresh per token | 10 / minute |

Exceeded limits return **429** `{"error":"too many requests"}` (no email enumeration).

Env: `AUTH_RATE_LIMIT_*` — see `.env.example`.

- **Local:** Redis down → fail open (warning in logs).
- **Production:** Redis down → fail closed when `AUTH_RATE_LIMIT_FAIL_CLOSED_PRODUCTION=true`.

### Private object storage

- MinIO init sets **`mc anonymous set none`** — bucket is private.
- **Do not** enable public bucket policy on MinIO or Cloudflare R2.
- All playback uses **presigned URLs** only.

Verify locally:

```bash
# Should fail (403/AccessDenied)
curl -sI "http://localhost:59000/school-camera-local/cameras/demo/live/sd_360p/index.m3u8"

# Should work (signed URL from API)
curl -s "http://localhost:58081/demo/live" | jq -r .signed_url
```

### `/demo/live`

- Local: `DEMO_LIVE_ENABLED=true` (default when `APP_ENV=local`).
- Production: **disabled** by default; startup **fails** if `DEMO_LIVE_ENABLED=true` with `APP_ENV=production`.
- Parents must use `GET /parent/cameras/:id/live`.

### Production startup checks

With `APP_ENV=production`, the API **refuses to start** if:

- `JWT_ACCESS_SECRET` is default or shorter than 32 characters
- `APP_ENCRYPTION_KEY` missing or invalid
- `DOMAIN` is empty or `localhost`
- `DEMO_LIVE_ENABLED=true`
- `S3_BUCKET_PUBLIC_ACCESS=true`
- `TELEGRAM_ALERTS_ENABLED=true` without token/chat ID

Warnings (non-fatal): `sslmode=disable` on Postgres, Redis without password.

### Netcup deployment warnings

- **Server `docker-compose.yml`:** If you customize compose on the server, run once: `git update-index --skip-worktree docker-compose.yml` so `git pull` does not overwrite it. `scripts/deploy.sh` does this automatically. To accept the repo version again: `git update-index --no-skip-worktree docker-compose.yml`. Prefer tracking shared production tweaks in `docker-compose.prod.yml` (pulled from git) and keeping host-only edits on the server file.
- Expose only **80** and **443** (Caddy) — never Postgres, Redis, or MinIO console publicly.
- Use **private R2 bucket** with presigned URLs only.
- Use a **real domain** for HTTPS.
- Rotate any secret that ever appeared in git or chat.

## School connectivity (Phase 18A)

Prepare secure school NVR/camera connectivity **without** public RTSP or port forwarding.

| Document | Purpose |
|----------|---------|
| [docs/school-connectivity.md](docs/school-connectivity.md) | Tailscale pilot, security rules, RTSP test procedure, troubleshooting |
| [docs/school-onboarding-checklist.md](docs/school-onboarding-checklist.md) | Privacy, network, and technical sign-off checklist |

**Security (non-negotiable):** No public RTSP, no NVR port forwarding, no exposed camera admin panels. Only `stream-worker` reaches RTSP over VPN; parents get signed HLS URLs only.

**First pilot:** Install Tailscale on Netcup and a school-side gateway; test with:

```bash
chmod +x scripts/test-rtsp.sh
./scripts/test-rtsp.sh "rtsp://user:pass@100.x.y.z:554/Streaming/Channels/102"
```

Docker alternative (if host has no `ffprobe`):

```bash
USE_DOCKER=1 ./scripts/test-rtsp.sh "rtsp://user:pass@100.x.y.z:554/path"
```

Do not paste RTSP credentials into logs or screenshots. RTSP URLs are configured via the admin API only — not in `.env`.

**Stream worker mode for first real camera:** `STREAM_WORKER_MODE=mixed` (keeps demo if needed). Later: `STREAM_WORKER_MODE=rtsp`.

Phase **18B** (next): first real RTSP/NVR end-to-end test using this setup.

## Admin dashboard (Phase 1)

Next.js admin UI in [`admin-dashboard/`](admin-dashboard/README.md).

```bash
cd admin-dashboard
cp .env.example .env.local
npm install
npm run dev -- -p 53000
```

Docker (binds **127.0.0.1:53000** only):

```bash
cd admin-dashboard
docker compose -f docker-compose.dashboard.yml up -d --build
```

Phase 1: layout shell, `/login` placeholder, `/dashboard` demo metrics.

**Phase 2:** Real admin login via `/auth/login`, session refresh, protected `/dashboard`, role blocking (`PARENT` denied). See [`admin-dashboard/README.md`](admin-dashboard/README.md).

```bash
cd admin-dashboard && npm run dev -- -p 53000
# http://localhost:53000/login
```

## Not in scope yet

- Technician school assignment table
- On-prem NVR retention management
- Telebirr / payment gateway integration (Phase 15 is manual approval only)
- Camera OFFLINE/ERROR status automation from worker (Phase 6 logs health events only)
- Simultaneous multi-quality live transcoding per camera (Phase 7 generates default quality only)
- Automatic ERROR status recovery policies beyond OFFLINE retry

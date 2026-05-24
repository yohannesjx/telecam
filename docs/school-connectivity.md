# School camera connectivity (Phase 18A)

Prepare secure connectivity between school NVR/cameras and the Netcup `stream-worker` **without** exposing RTSP or NVR admin ports on the public internet.

This phase does **not** require a real camera yet. It documents the pilot setup for **Phase 18B** (first real RTSP/NVR test).

## Target flow

```
School NVR / cameras (private LAN)
        ↓
Tailscale or WireGuard private tunnel
        ↓
Netcup stream-worker (decrypts RTSP, runs FFmpeg)
        ↓
Cloudflare R2 (HLS segments + playlists)
        ↓
Parent app (signed HLS URLs only — never RTSP)
```

---

## A. Security principles

**Never use:**

- Public RTSP URLs reachable from the internet
- Router port forwarding to NVR or cameras
- Public camera or NVR IP addresses
- Exposed NVR/camera admin web panels

**Always:**

- Keep cameras and NVR on a private school LAN
- Use **Tailscale** (first pilot) or **WireGuard** (later, self-managed) so only trusted devices join the tunnel
- Allow **only** the Netcup `stream-worker` to connect to RTSP (via VPN IP or MagicDNS hostname)
- Store RTSP credentials via the **admin API** (encrypted at rest with `APP_ENCRYPTION_KEY`)
- Give parents **signed HLS URLs only** — never RTSP, NVR login, or raw R2 paths

**Do not:**

- Share NVR/camera admin credentials with parents or staff who do not need them
- Paste RTSP URLs with passwords into tickets, chat, or screenshots
- Commit RTSP URLs or `.env` secrets to git

---

## B. Recommended pilot setup (Tailscale)

Tailscale is recommended for the **first pilot** because it handles NAT traversal, device enrollment, and MagicDNS with minimal ops overhead.

### Netcup server

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Note the server’s Tailscale IP (e.g. `100.x.y.z`) with `tailscale status`.

### School-side gateway

Install Tailscale on a device that can reach the NVR/camera LAN:

- Mini PC or Raspberry Pi on the school network, **or**
- Existing school PC, **or**
- Router/NVR with Tailscale support (if available)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Both devices must appear in the **same Tailnet**.

### RTSP from Netcup

From Netcup (or the `stream-worker` container host), the worker connects using the school gateway’s **Tailscale IP** or **MagicDNS** name — not the school’s public IP.

Example RTSP URLs (configure via admin API, not in `.env`):

```text
rtsp://username:password@100.x.y.z:554/Streaming/Channels/102
rtsp://username:password@school-gateway:554/Streaming/Channels/102
```

Use the **substream** channel (often channel `102` on Hikvision-style NVRs), not the main high-bitrate stream.

### Verify connectivity

```bash
tailscale status
ping <school-gateway-tailscale-ip>
./scripts/test-rtsp.sh "rtsp://user:pass@100.x.y.z:554/..."
```

### Optional Tailscale ACLs

Restrict access so that:

- Netcup can reach the school gateway on RTSP port(s) only
- School gateway cannot access unrelated servers on the Tailnet
- Parents and school staff are **not** on the Tailnet (they use the mobile/web app only)

See [Tailscale ACL docs](https://tailscale.com/kb/1018/acls).

---

## C. School-side gateway options

| Option | Notes |
|--------|--------|
| Mini PC | Reliable; easy to install Tailscale and run diagnostics |
| Raspberry Pi | Low cost; ensure stable power and cooling |
| Existing school computer | Quick pilot if always on during school hours |
| Router with Tailscale/WireGuard | Fewer extra devices; depends on hardware support |
| NVR with VPN client | Best when supported natively; check vendor docs |

The gateway only needs to **route RTSP** from the NVR LAN to Tailscale — it does not run the platform `stream-worker` unless you choose to colocate testing tools there.

---

## D. Network checklist

Before Phase 18B:

- [ ] Stable fiber (or reliable) internet with tested **upload** speed (see onboarding checklist)
- [ ] UPS for router, ONU/fiber modem, PoE switch, and NVR
- [ ] RTSP enabled on NVR/camera (substream)
- [ ] **Sub-stream** selected — not main stream
- [ ] Target bitrate **300–500 Kbps** (360p/480p)
- [ ] Resolution **360p or 480p** for parent live view
- [ ] **Audio disabled** by default (privacy policy)
- [ ] NVR and camera default passwords changed
- [ ] No port forwarding rules for RTSP, NVR HTTP, or ONVIF on the school router

---

## E. Pilot test procedure (Phase 18B)

1. **Tailscale** — Confirm Netcup and school gateway are in the same Tailnet (`tailscale status` on both).
2. **Ping** — From Netcup: `ping <school-gateway-tailscale-ip>`.
3. **RTSP probe** — On Netcup: `./scripts/test-rtsp.sh "rtsp://..."` (credentials redacted in script output).
4. **Admin API** — Create or update camera with `rtsp_url`; API encrypts before storage. Response never includes `rtsp_url`.
5. **R2 paths** — Set `r2_live_path` to:
   ```text
   cameras/{school_id}/{camera_id}/live/sd_360p/index.m3u8
   ```
6. **Stream worker mode** — Set `STREAM_WORKER_MODE=mixed` for first real camera (keeps demo if needed). Later use `rtsp` when all cameras are real.
7. **Deploy** — Rebuild/restart `stream-worker` on Netcup.
8. **R2** — Confirm HLS segments and playlist appear under the camera prefix in R2.
9. **Parent live** — During school hours, `GET /parent/cameras/:id/live` returns a signed URL.
10. **Timeline / playback** — Confirm recorded segments and playback for a school day.
11. **Offline test** — Disconnect school internet briefly; confirm offline alerts fire and recover when back online.

---

## F. Troubleshooting

| Symptom | Likely cause | What to check |
|---------|----------------|---------------|
| RTSP auth failure | Wrong user/password or channel path | NVR RTSP URL in vendor docs; substream channel ID |
| Connection timeout | Tailscale down, ACL block, or wrong IP | `tailscale status`, ACLs, ping, firewall on gateway |
| No route to host | Gateway offline or not on Tailnet | School power/UPS, Tailscale service on gateway |
| FFmpeg exits immediately | Codec/bitrate unsupported, bad URL | `./scripts/test-rtsp.sh`, stream-worker logs |
| No HLS segments in R2 | Upload failure, wrong `r2_live_path`, worker error | R2 credentials, `stream-worker` logs, `CAMERA_UPLOAD_FAILED` events |
| Tailscale ACL issue | Traffic blocked between nodes | Tailscale admin → ACL tester |
| Choppy live / gaps | Upload bandwidth too low | Run upload speed test at school; lower substream bitrate |
| Live 409 outside hours | Scheduler / school schedule | Expected outside Mon–Fri school window; timeline still works |

Stream-worker logs **never** print RTSP URLs or credentials. Use health events and `./scripts/test-rtsp.sh` for connectivity debugging.

---

## Docker-based RTSP test (no host ffprobe)

If `ffprobe` is not installed on Netcup:

```bash
docker run --rm jrottenberg/ffmpeg:4.4-alpine \
  -v error \
  -rtsp_transport tcp \
  -i "rtsp://USER:PASS@100.x.y.z:554/path" \
  -t 5 \
  -f null -
```

**Warning:** Do not paste credentials into shared terminals, screenshots, or support tickets. Prefer `./scripts/test-rtsp.sh`, which redacts credentials in output.

For JSON stream details with Docker:

```bash
docker run --rm --entrypoint ffprobe jrottenberg/ffmpeg:4.4-alpine \
  -v error -rtsp_transport tcp \
  -show_streams -show_format -of json \
  "rtsp://USER:PASS@100.x.y.z:554/path"
```

---

## WireGuard (later)

WireGuard is supported as a **future** option for large or fully self-managed deployments:

- You operate your own VPN server (e.g. on Netcup) and school gateways as clients
- More control over routing and keys; more ops work than Tailscale

**Recommendation:** Use **Tailscale for the first pilot** (Phase 18B). Plan WireGuard when you need multi-site scale without Tailscale SaaS dependency.

---

## Related docs

- [School onboarding checklist](./school-onboarding-checklist.md)
- [README — Stream worker & RTSP](../README.md#stream-worker-phase-6)
- [README — Admin camera create](../README.md#admin-api-examples)

## Adding a real camera (admin API)

1. `POST /admin/schools/:school_id/cameras` or `PATCH /admin/cameras/:id` with `rtsp_url`.
2. API encrypts `rtsp_url` → `encrypted_rtsp_url` in PostgreSQL.
3. API responses **never** return `rtsp_url` or decrypted RTSP.
4. Set `r2_live_path`: `cameras/{school_id}/{camera_id}/live/sd_360p/index.m3u8`
5. Set `default_quality`: `sd_360p` (or `low_240p` / `sd_480p`).
6. Set `STREAM_WORKER_MODE=mixed` until demo cameras are retired, then `rtsp`.

RTSP URLs are **not** set in `.env` — only via the admin API after VPN connectivity is verified.

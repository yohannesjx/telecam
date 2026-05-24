# School onboarding checklist (Phase 18A)

Use this checklist before enabling a school’s cameras in production. Complete **Phase 18B** technical validation after VPN and RTSP connectivity are in place.

See also: [School connectivity guide](./school-connectivity.md)

---

## School information

| Item | Done | Notes |
|------|:----:|-------|
| School legal name | ☐ | |
| Address | ☐ | |
| Primary contact (name, phone, email) | ☐ | |
| Internet provider | ☐ | |
| Upload speed test (Mbps) | ☐ | Target ≥ 5 Mbps upload for one 360p stream; more for multiple cameras |
| Download speed test (Mbps) | ☐ | |
| Power backup (UPS) at school | ☐ | Router, ONU, PoE, NVR |

---

## Camera / NVR

| Item | Done | Notes |
|------|:----:|-------|
| Camera brand / model | ☐ | |
| NVR brand / model | ☐ | |
| Number of cameras (pilot) | ☐ | Start with one classroom |
| RTSP sub-stream enabled | ☐ | Not main stream |
| Sub-stream bitrate 300–500 Kbps | ☐ | |
| Resolution 360p or 480p | ☐ | |
| Audio disabled | ☐ | Platform default: no audio |
| Camera placement approved by school | ☐ | |
| Toilets / changing areas excluded | ☐ | **Required** |
| NVR default password changed | ☐ | |
| Dedicated RTSP user (least privilege) | ☐ | Separate from admin login |

---

## Network & security

| Item | Done | Notes |
|------|:----:|-------|
| Tailscale (or WireGuard) installed — Netcup | ☐ | |
| Tailscale (or WireGuard) installed — school gateway | ☐ | |
| Same Tailnet / VPN verified | ☐ | `tailscale status` |
| **No** public RTSP port forwarding | ☐ | |
| **No** NVR admin panel exposed to internet | ☐ | |
| Router admin password changed | ☐ | |
| School gateway can reach NVR RTSP on LAN | ☐ | Test from gateway device |
| Netcup can reach RTSP via VPN | ☐ | `./scripts/test-rtsp.sh` |
| Tailscale ACLs reviewed (optional) | ☐ | Netcup → gateway RTSP only |

---

## Privacy & legal

| Item | Done | Notes |
|------|:----:|-------|
| Parent consent form prepared | ☐ | |
| School contract signed | ☐ | |
| Camera zones documented (which rooms) | ☐ | |
| Retention policy explained (default 7 days cloud) | ☐ | `RETENTION_RECORDING_DAYS` |
| No-audio policy communicated | ☐ | |
| Staff trained: no sharing NVR login with parents | ☐ | |

---

## Platform configuration

| Item | Done | Notes |
|------|:----:|-------|
| School + classroom created in admin API | ☐ | |
| Camera created with encrypted `rtsp_url` | ☐ | Never log or share URL |
| `r2_live_path` set correctly | ☐ | `cameras/{school_id}/{camera_id}/live/sd_360p/index.m3u8` |
| `STREAM_WORKER_MODE=mixed` (first pilot) | ☐ | |
| `APP_ENCRYPTION_KEY` same on API and stream-worker | ☐ | |
| R2 bucket private; presigned URLs only | ☐ | |
| Scheduler timezone / hours configured | ☐ | Match school day |
| Telegram alerts configured (optional) | ☐ | Offline notifications |

---

## Technical validation (Phase 18B)

| Item | Done | Notes |
|------|:----:|-------|
| `./scripts/test-rtsp.sh` passes from Netcup | ☐ | |
| stream-worker uploads HLS to R2 | ☐ | Check bucket prefix |
| Parent live view works (school hours) | ☐ | Signed URL only |
| Timeline shows blocks for school day | ☐ | |
| Playback works for prior recording | ☐ | |
| Offline alert when school internet dropped | ☐ | |
| Recovery when internet restored | ☐ | |
| Retention worker runs (dry-run first if unsure) | ☐ | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| School contact | | | |
| Platform operator | | | |

**Pilot complete when all Technical validation items are checked.**

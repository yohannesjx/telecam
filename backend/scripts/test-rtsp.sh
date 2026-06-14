#!/usr/bin/env bash
# Test RTSP connectivity from Netcup (or school gateway) before adding a camera via admin API.
#
# Usage:
#   ./scripts/test-rtsp.sh "rtsp://user:pass@100.x.y.z:554/path"
#
# Requires ffprobe (ffmpeg package) on the host, or set USE_DOCKER=1.
#
# Security:
#   - Does not echo the full RTSP URL (credentials redacted).
#   - Do not paste RTSP URLs with passwords into chat or screenshots.

set -euo pipefail

RTSP_URL="${1:-}"
USE_DOCKER="${USE_DOCKER:-0}"

if [[ -z "$RTSP_URL" ]]; then
  echo "Usage: $0 \"rtsp://user:pass@host:554/path\"" >&2
  echo "       USE_DOCKER=1 $0 \"rtsp://...\"" >&2
  exit 2
fi

if [[ "$RTSP_URL" != rtsp://* && "$RTSP_URL" != rtsps://* ]]; then
  echo "error: URL must start with rtsp:// or rtsps://" >&2
  exit 2
fi

# Redact user:password@ for safe logging.
redact_rtsp() {
  local url="$1"
  if [[ "$url" =~ ^(rtsps?://)([^/@]+@)(.*)$ ]]; then
    printf '%s***:***@%s' "${BASH_REMATCH[1]}" "${BASH_REMATCH[3]}"
  else
    printf '%s' "$url"
  fi
}

SAFE_URL="$(redact_rtsp "$RTSP_URL")"
echo "Testing RTSP: $SAFE_URL"

PROBE_JSON=""
PROBE_ERR=""
TMP_JSON="$(mktemp)"
TMP_ERR="$(mktemp)"
trap 'rm -f "$TMP_JSON" "$TMP_ERR"' EXIT

run_ffprobe() {
  if [[ "$USE_DOCKER" == "1" ]]; then
    docker run --rm --entrypoint ffprobe jrottenberg/ffmpeg:4.4-alpine \
      -v error \
      -rtsp_transport tcp \
      -show_streams -show_format \
      -of json \
      "$RTSP_URL" >"$TMP_JSON" 2>"$TMP_ERR"
  elif command -v ffprobe >/dev/null 2>&1; then
    ffprobe -v error \
      -rtsp_transport tcp \
      -show_streams -show_format \
      -of json \
      "$RTSP_URL" >"$TMP_JSON" 2>"$TMP_ERR"
  else
    echo "error: ffprobe not found. Install ffmpeg or run with USE_DOCKER=1" >&2
    exit 3
  fi
}

if ! run_ffprobe; then
  echo "Connection: FAILED"
  # Redact credentials from stderr if ffmpeg printed the URL.
  sed -E 's#(rtsps?://)([^/@[:space:]]+@)#\1***:***@#g' "$TMP_ERR" | head -20 >&2
  exit 1
fi

PROBE_JSON="$(cat "$TMP_JSON")"
echo "Connection: OK"

# Parse stream info with python3 (common on servers) or basic grep fallback.
if command -v python3 >/dev/null 2>&1; then
  python3 - "$PROBE_JSON" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
streams = data.get("streams", [])
fmt = data.get("format", {})
video = next((s for s in streams if s.get("codec_type") == "video"), None)
audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
if video:
    w, h = video.get("width"), video.get("height")
    print(f"Video codec: {video.get('codec_name', 'unknown')}")
    if w and h:
        print(f"Resolution: {w}x{h}")
    br = video.get("bit_rate") or fmt.get("bit_rate")
    if br:
        print(f"Bitrate: {int(br) // 1000} kbps (approx)")
else:
    print("Video codec: (none detected)")
if audio:
    print(f"Audio track: yes ({audio.get('codec_name', 'unknown')})")
    print("Warning: audio is enabled on this stream; disable at NVR for privacy.")
else:
    print("Audio track: no")
PY
else
  echo "Video/audio details: install python3 for parsed output, or inspect ffprobe JSON manually."
  echo "$PROBE_JSON" | head -c 2000
  echo ""
fi

exit 0

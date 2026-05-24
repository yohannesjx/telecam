import type {
  CameraHealthAlert,
  CameraHealthEvent,
  CameraOperationalStatus,
  NormalizedCameraHealth,
  NormalizedCameraStatus,
  NormalizedSchedulerStatus,
  NormalizedSchool,
  SchoolCameraStatusResponse,
} from "@/lib/admin/camera-monitoring-types";

const SENSITIVE_KEYS = new Set([
  "rtsp_url",
  "rtspUrl",
  "encrypted_rtsp",
  "encryptedRtsp",
  "signed_url",
  "signedUrl",
  "playlist_key",
  "playlistKey",
  "hls_url",
  "hlsUrl",
  "playback_url",
  "playbackUrl",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function optionalNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = num(value);
  return Number.isFinite(n) ? n : null;
}

function unwrapPayload(raw: unknown): unknown {
  if (isRecord(raw) && "data" in raw) return raw.data;
  return raw;
}

function stripSensitive<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_KEYS.has(key)) {
      delete out[key];
    }
  }
  return out;
}

export function mapOperationalStatus(input: {
  rawStatus?: string;
  desiredState?: string;
  scheduleReason?: string;
  lastHealthEvent?: string | null;
  lastSegmentAt?: string | null;
}): CameraOperationalStatus {
  const status = (input.rawStatus ?? "").toUpperCase();
  const desired = (input.desiredState ?? "").toUpperCase();
  const reason = (input.scheduleReason ?? "").toUpperCase();
  const lastEvent = (input.lastHealthEvent ?? "").toUpperCase();

  if (status === "DISABLED") return "disabled";
  if (status === "ERROR") return "error";
  if (status === "OFFLINE") return "offline";
  if (status === "NO_SEGMENT_UPLOADED" || lastEvent.includes("NO_SEGMENT")) {
    return "no_recent_segment";
  }

  if (
    (status === "ACTIVE" || status === "ONLINE") &&
    desired === "STOPPED" &&
    (reason.includes("WEEKEND") ||
      reason.includes("OUTSIDE_SCHEDULE") ||
      reason.includes("SCHEDULE") ||
      reason !== "")
  ) {
    return "stopped_by_schedule";
  }

  if (status === "ACTIVE" && desired === "STOPPED") return "stopped_by_schedule";
  if (status === "ONLINE" || (status === "ACTIVE" && desired === "RUNNING")) {
    return "online";
  }
  if (status === "ACTIVE" && !desired) return "online";

  return "unknown";
}

function normalizeCameraRow(
  raw: Record<string, unknown>,
  school?: { id?: string; name?: string },
): NormalizedCameraStatus {
  const safe = stripSensitive(raw);
  const id = str(pick(safe, ["id", "camera_id", "cameraId"])) ?? "";
  const rawStatus = str(pick(safe, ["status", "camera_status"])) ?? "";
  const desiredState = str(pick(safe, ["desired_state", "desiredState"]));
  const scheduleReason = str(pick(safe, ["reason", "schedule_reason", "scheduleReason"]));
  const lastHealthEvent = str(pick(safe, ["last_health_event", "lastHealthEvent"])) ?? null;
  const lastSegmentAt = str(pick(safe, ["last_segment_at", "lastSegmentAt"])) ?? null;

  return {
    id,
    name: str(pick(safe, ["name", "camera_name", "cameraName"])) ?? "Unknown camera",
    schoolId: school?.id ?? str(pick(safe, ["school_id", "schoolId"])),
    schoolName: school?.name ?? str(pick(safe, ["school_name", "schoolName"])),
    classroomId: str(pick(safe, ["classroom_id", "classroomId"])),
    classroomName: str(pick(safe, ["classroom_name", "classroomName"])),
    rawStatus,
    desiredState,
    scheduleReason,
    defaultQuality: str(pick(safe, ["default_quality", "defaultQuality"])),
    lastSegmentAt,
    streamLagSeconds: optionalNum(pick(safe, ["stream_lag_seconds", "streamLagSeconds"])),
    lastSegmentAgeMinutes: optionalNum(
      pick(safe, ["last_segment_age_minutes", "lastSegmentAgeMinutes"]),
    ),
    openAlerts: num(pick(safe, ["open_alerts", "openAlerts"])),
    lastHealthEvent,
    status: mapOperationalStatus({
      rawStatus,
      desiredState,
      scheduleReason,
      lastHealthEvent,
      lastSegmentAt,
    }),
  };
}

export function normalizeSchoolCameraStatus(raw: unknown): SchoolCameraStatusResponse {
  const payload = unwrapPayload(raw);
  const root = isRecord(payload) ? payload : {};
  const schoolId = str(pick(root, ["school_id", "schoolId"])) ?? "";
  const schoolName = str(pick(root, ["school_name", "schoolName"])) ?? "";
  const camerasRaw = root.cameras;
  const cameras = Array.isArray(camerasRaw)
    ? camerasRaw
        .filter(isRecord)
        .map((row) => normalizeCameraRow(row, { id: schoolId, name: schoolName }))
    : [];

  return { schoolId, schoolName, cameras };
}

export function normalizeSchools(raw: unknown): NormalizedSchool[] {
  const payload = unwrapPayload(raw);
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .filter(isRecord)
    .map((row) => ({
      id: str(pick(row, ["id", "school_id", "schoolId"])) ?? "",
      name: str(pick(row, ["name", "school_name", "schoolName"])) ?? "Unknown school",
      status: str(pick(row, ["status"])),
    }))
    .filter((school) => school.id !== "");
}

function normalizeHealthEvent(raw: Record<string, unknown>): CameraHealthEvent {
  const safe = stripSensitive(raw);
  return {
    id: str(pick(safe, ["id", "event_id", "eventId"])),
    eventType: str(pick(safe, ["event_type", "eventType", "type"])),
    severity: str(pick(safe, ["severity"])),
    message: str(pick(safe, ["message"])),
    createdAt: str(pick(safe, ["created_at", "createdAt", "opened_at", "openedAt"])),
  };
}

function normalizeHealthAlert(raw: Record<string, unknown>): CameraHealthAlert {
  const safe = stripSensitive(raw);
  return {
    id: str(pick(safe, ["id"])),
    type: str(pick(safe, ["alert_type", "alertType", "type"])),
    severity: str(pick(safe, ["severity"])),
    status: str(pick(safe, ["status"])),
    message: str(pick(safe, ["message", "title"])),
    createdAt: str(pick(safe, ["opened_at", "openedAt", "created_at", "createdAt"])),
  };
}

export function normalizeCameraHealth(raw: unknown): NormalizedCameraHealth {
  const payload = unwrapPayload(raw);
  const root = isRecord(payload) ? stripSensitive(payload) : {};
  const rawStatus = str(pick(root, ["status", "camera_status"])) ?? "";
  const desiredState = str(pick(root, ["desired_state", "desiredState"]));
  const scheduleReason = str(pick(root, ["reason", "schedule_reason", "scheduleReason"]));
  const eventsRaw = root.recent_events ?? root.recentEvents ?? root.events;
  const alertsRaw = root.open_alerts ?? root.openAlerts ?? root.alerts;

  const events = Array.isArray(eventsRaw)
    ? eventsRaw.filter(isRecord).map(normalizeHealthEvent)
    : [];
  const alerts = Array.isArray(alertsRaw)
    ? alertsRaw.filter(isRecord).map(normalizeHealthAlert)
    : [];

  const lastHealthEvent =
    events[0]?.eventType ??
    str(pick(root, ["last_health_event", "lastHealthEvent"])) ??
    null;
  const lastSegmentAt = str(pick(root, ["last_segment_at", "lastSegmentAt"])) ?? null;

  return {
    id: str(pick(root, ["camera_id", "cameraId", "id"])) ?? "",
    name: str(pick(root, ["camera_name", "cameraName", "name"])),
    schoolName: str(pick(root, ["school_name", "schoolName"])),
    classroomName: str(pick(root, ["classroom_name", "classroomName"])),
    rawStatus,
    desiredState,
    scheduleReason,
    defaultQuality: str(pick(root, ["default_quality", "defaultQuality"])),
    lastSegmentAt,
    streamLagSeconds: optionalNum(pick(root, ["stream_lag_seconds", "streamLagSeconds"])),
    lastSegmentAgeMinutes: optionalNum(
      pick(root, ["last_segment_age_minutes", "lastSegmentAgeMinutes"]),
    ),
    openAlertsCount: Array.isArray(alertsRaw) ? alerts.length : num(alertsRaw),
    lastHealthEvent,
    playlistExists: Boolean(pick(root, ["playlist_exists", "playlistExists"])),
    events,
    alerts,
    lastWorkerHeartbeat: str(
      pick(root, ["last_stream_worker_seen_at", "lastWorkerHeartbeat", "last_worker_heartbeat"]),
    ),
    status: mapOperationalStatus({
      rawStatus,
      desiredState,
      scheduleReason,
      lastHealthEvent,
      lastSegmentAt,
    }),
  };
}

export function mergeStreamState(
  health: NormalizedCameraHealth,
  streamState: unknown,
): NormalizedCameraHealth {
  const payload = unwrapPayload(streamState);
  const root = isRecord(payload) ? stripSensitive(payload) : {};
  const desiredState =
    str(pick(root, ["desired_state", "desiredState"])) ?? health.desiredState;
  const scheduleReason = str(pick(root, ["reason", "scheduleReason"])) ?? health.scheduleReason;

  return {
    ...health,
    desiredState,
    scheduleReason,
    status: mapOperationalStatus({
      rawStatus: health.rawStatus,
      desiredState,
      scheduleReason,
      lastHealthEvent: health.lastHealthEvent,
      lastSegmentAt: health.lastSegmentAt,
    }),
  };
}

export function normalizeSchedulerStatus(raw: unknown): NormalizedSchedulerStatus {
  const payload = unwrapPayload(raw);
  const root = isRecord(payload) ? payload : {};
  const days = root.recording_days ?? root.recordingDays;

  return {
    timezone: str(pick(root, ["timezone"])),
    currentState: str(pick(root, ["current_state", "currentState"])),
    reason: str(pick(root, ["reason"])),
    recordingStartTime: str(pick(root, ["recording_start_time", "recordingStartTime"])),
    recordingEndTime: str(pick(root, ["recording_end_time", "recordingEndTime"])),
    recordingDays: Array.isArray(days) ? days.map(String) : undefined,
    nextStartAt: str(pick(root, ["next_start_at", "nextStartAt"])) ?? null,
    nextStopAt: str(pick(root, ["next_stop_at", "nextStopAt"])) ?? null,
    camerasRunningDesired: optionalNum(
      pick(root, ["cameras_running_desired", "camerasRunningDesired"]),
    ) ?? undefined,
    camerasStoppedDesired: optionalNum(
      pick(root, ["cameras_stopped_desired", "camerasStoppedDesired"]),
    ) ?? undefined,
  };
}

export function computeCameraStatusSummary(
  cameras: NormalizedCameraStatus[],
): import("@/lib/admin/camera-monitoring-types").CameraStatusSummary {
  const summary = {
    total: cameras.length,
    online: 0,
    offline: 0,
    stoppedBySchedule: 0,
    noRecentSegment: 0,
    error: 0,
    disabled: 0,
    openAlerts: 0,
  };

  for (const camera of cameras) {
    summary.openAlerts += camera.openAlerts ?? 0;
    switch (camera.status) {
      case "online":
        summary.online += 1;
        break;
      case "offline":
        summary.offline += 1;
        break;
      case "stopped_by_schedule":
        summary.stoppedBySchedule += 1;
        break;
      case "no_recent_segment":
        summary.noRecentSegment += 1;
        break;
      case "error":
        summary.error += 1;
        break;
      case "disabled":
        summary.disabled += 1;
        break;
    }
  }

  return summary;
}

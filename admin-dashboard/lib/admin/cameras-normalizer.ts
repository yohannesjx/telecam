import type {
  CameraStatus,
  NormalizedCamera,
  NormalizedCameraDetail,
  NormalizedCameraStreamState,
  NormalizedClassroom,
} from "@/lib/admin/cameras-types";

const STRIP_KEYS = new Set([
  "rtsp_url",
  "rtspUrl",
  "encrypted_rtsp_url",
  "encryptedRtspUrl",
  "signed_url",
  "signedUrl",
  "hls_url",
  "hlsUrl",
  "playback_url",
  "playbackUrl",
  "r2_live_path",
  "r2LivePath",
  "r2_recording_path",
  "r2RecordingPath",
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

function stripSensitive(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!STRIP_KEYS.has(key)) out[key] = value;
  }
  return out;
}

function normalizeCameraStatus(value: unknown): CameraStatus {
  const s = String(value ?? "").toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "DISABLED") return "DISABLED";
  if (s === "ONLINE") return "ONLINE";
  if (s === "OFFLINE") return "OFFLINE";
  if (s === "ERROR") return "ERROR";
  if (s === "STOPPED") return "STOPPED";
  return "UNKNOWN";
}

export function normalizeCamera(raw: unknown): NormalizedCamera {
  const row = isRecord(raw) ? stripSensitive(raw) : {};
  return {
    id: str(pick(row, ["id", "camera_id", "cameraId"])) ?? "",
    name: str(pick(row, ["name", "camera_name", "cameraName"])) ?? "Unknown camera",
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    classroomId: str(pick(row, ["classroom_id", "classroomId"])) ?? null,
    classroomName: str(pick(row, ["classroom_name", "classroomName"])) ?? null,
    status: normalizeCameraStatus(pick(row, ["status"])),
    defaultQuality: str(pick(row, ["default_quality", "defaultQuality"])) ?? null,
    desiredState: str(pick(row, ["desired_state", "desiredState"])) ?? null,
    scheduleReason: str(pick(row, ["reason", "schedule_reason", "scheduleReason"])) ?? null,
    lastSegmentAt: str(pick(row, ["last_segment_at", "lastSegmentAt"])) ?? null,
    openAlerts: undefined,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeCameras(raw: unknown): NormalizedCamera[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["cameras", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).map((row) => normalizeCamera(row));
}

export function normalizeCameraDetail(raw: unknown): NormalizedCameraDetail {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  if (isRecord(payload)) {
    const nested = pick(payload, ["camera"]);
    if (isRecord(nested)) return normalizeCamera(nested);
  }
  return normalizeCamera(payload);
}

export function normalizeCameraStreamState(raw: unknown): NormalizedCameraStreamState {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const row = isRecord(payload) ? stripSensitive(payload) : {};
  return {
    cameraId: str(pick(row, ["camera_id", "cameraId", "id"])),
    desiredState: str(pick(row, ["desired_state", "desiredState"])) ?? null,
    reason: str(pick(row, ["reason", "schedule_reason"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeClassrooms(raw: unknown): NormalizedClassroom[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["classrooms", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(isRecord)
    .map((row) => ({
      id: str(pick(row, ["id", "classroom_id"])) ?? "",
      name: str(pick(row, ["name"])) ?? "Unknown classroom",
    }))
    .filter((c) => c.id !== "");
}

export function enrichCamerasWithNames(
  cameras: NormalizedCamera[],
  schools: { id: string; name: string }[],
  classrooms: NormalizedClassroom[],
  schoolId?: string,
): NormalizedCamera[] {
  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));
  const classroomMap = new Map(classrooms.map((c) => [c.id, c.name]));
  return cameras.map((camera) => ({
    ...camera,
    schoolId: camera.schoolId ?? schoolId ?? null,
    schoolName:
      camera.schoolName ??
      (camera.schoolId ? schoolMap.get(camera.schoolId) ?? null : schoolId ? schoolMap.get(schoolId) ?? null : null),
    classroomName:
      camera.classroomName ??
      (camera.classroomId ? classroomMap.get(camera.classroomId) ?? null : null),
  }));
}

export function mergeCameraStatus(
  cameras: NormalizedCamera[],
  statusCameras: Array<{
    id: string;
    desiredState?: string | null;
    scheduleReason?: string | null;
    lastSegmentAt?: string | null;
    openAlerts?: number;
    status?: string;
  }>,
): NormalizedCamera[] {
  const map = new Map(statusCameras.map((c) => [c.id, c]));
  return cameras.map((camera) => {
    const status = map.get(camera.id);
    if (!status) return camera;
    return {
      ...camera,
      desiredState: status.desiredState ?? camera.desiredState,
      scheduleReason: status.scheduleReason ?? camera.scheduleReason,
      lastSegmentAt: status.lastSegmentAt ?? camera.lastSegmentAt,
      openAlerts: status.openAlerts ?? camera.openAlerts,
      status: status.status
        ? normalizeCameraStatus(status.status)
        : camera.status,
    };
  });
}

export function buildR2LivePath(
  schoolId: string,
  cameraId: string,
  quality: string,
): string {
  return `cameras/${schoolId}/${cameraId}/live/${quality}/index.m3u8`;
}

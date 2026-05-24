import { ApiError, apiFetch } from "@/lib/api";
import {
  mergeStreamState,
  normalizeCameraHealth,
  normalizeSchedulerStatus,
  normalizeSchoolCameraStatus,
  normalizeSchools,
} from "@/lib/admin/camera-monitoring-normalizer";
import type {
  NormalizedCameraHealth,
  NormalizedSchedulerStatus,
  NormalizedSchool,
  SchoolCameraStatusResponse,
} from "@/lib/admin/camera-monitoring-types";

export async function listSchools(): Promise<NormalizedSchool[]> {
  try {
    const raw = await apiFetch<unknown>("/admin/schools", { method: "GET" });
    return normalizeSchools(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return [];
    }
    throw err;
  }
}

export async function getSchoolCameraStatus(
  schoolId: string,
): Promise<SchoolCameraStatusResponse> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/cameras/status`,
    { method: "GET" },
  );
  return normalizeSchoolCameraStatus(raw);
}

export async function getCameraHealth(cameraId: string): Promise<NormalizedCameraHealth> {
  const raw = await apiFetch<unknown>(
    `/admin/cameras/${encodeURIComponent(cameraId)}/health`,
    { method: "GET" },
  );
  return normalizeCameraHealth(raw);
}

export async function getCameraStreamState(cameraId: string): Promise<unknown> {
  return apiFetch<unknown>(
    `/admin/cameras/${encodeURIComponent(cameraId)}/stream-state`,
    { method: "GET" },
  );
}

export async function getCameraHealthDetail(
  cameraId: string,
): Promise<NormalizedCameraHealth> {
  const [health, streamState] = await Promise.all([
    getCameraHealth(cameraId),
    getCameraStreamState(cameraId).catch(() => null),
  ]);

  if (streamState) {
    return mergeStreamState(health, streamState);
  }
  return health;
}

export async function getSchedulerStatus(): Promise<NormalizedSchedulerStatus> {
  const raw = await apiFetch<unknown>("/admin/scheduler/status", { method: "GET" });
  return normalizeSchedulerStatus(raw);
}

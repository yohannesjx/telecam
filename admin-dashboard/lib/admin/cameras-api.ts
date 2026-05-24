import { apiFetch } from "@/lib/api";
import { listSchools } from "@/lib/admin/camera-monitoring-api";
import {
  buildR2LivePath,
  normalizeCameraDetail,
  normalizeCameras,
  normalizeCameraStreamState,
  normalizeClassrooms,
} from "@/lib/admin/cameras-normalizer";
import type {
  CreateCameraInput,
  NormalizedCamera,
  NormalizedCameraDetail,
  NormalizedCameraStreamState,
  NormalizedClassroom,
  UpdateCameraInput,
} from "@/lib/admin/cameras-types";

export { listSchools };

export async function getSchoolCameras(schoolId: string): Promise<NormalizedCamera[]> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/cameras`,
    { method: "GET" },
  );
  return normalizeCameras(raw);
}

export async function getCamera(cameraId: string): Promise<NormalizedCameraDetail> {
  const raw = await apiFetch<unknown>(
    `/admin/cameras/${encodeURIComponent(cameraId)}`,
    { method: "GET" },
  );
  return normalizeCameraDetail(raw);
}

export async function getSchoolClassrooms(
  schoolId: string,
): Promise<NormalizedClassroom[]> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/classrooms`,
    { method: "GET" },
  );
  return normalizeClassrooms(raw);
}

export async function getCameraStreamState(
  cameraId: string,
): Promise<NormalizedCameraStreamState> {
  const raw = await apiFetch<unknown>(
    `/admin/cameras/${encodeURIComponent(cameraId)}/stream-state`,
    { method: "GET" },
  );
  return normalizeCameraStreamState(raw);
}

async function patchCameraInternal(
  cameraId: string,
  body: Record<string, unknown>,
): Promise<NormalizedCameraDetail> {
  const raw = await apiFetch<unknown>(
    `/admin/cameras/${encodeURIComponent(cameraId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return normalizeCameraDetail(raw);
}

export async function createCamera(
  schoolId: string,
  input: CreateCameraInput,
): Promise<NormalizedCameraDetail> {
  const placeholderPath = `cameras/${schoolId}/pending/live/${input.default_quality}/index.m3u8`;
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/cameras`,
    {
      method: "POST",
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        name: input.name,
        rtsp_url: input.rtsp_url,
        default_quality: input.default_quality,
        r2_live_path: placeholderPath,
      }),
    },
  );
  const camera = normalizeCameraDetail(raw);
  const correctPath = buildR2LivePath(schoolId, camera.id, input.default_quality);
  if (correctPath !== placeholderPath) {
    try {
      return await patchCameraInternal(camera.id, { r2_live_path: correctPath });
    } catch {
      return camera;
    }
  }
  return camera;
}

export async function updateCamera(
  cameraId: string,
  input: UpdateCameraInput,
): Promise<NormalizedCameraDetail> {
  const body: Record<string, unknown> = {};
  if (input.classroom_id) body.classroom_id = input.classroom_id;
  if (input.name) body.name = input.name;
  if (input.default_quality) body.default_quality = input.default_quality;
  if (input.status) body.status = input.status;
  if (input.rtsp_url && input.rtsp_url.trim()) body.rtsp_url = input.rtsp_url.trim();
  return patchCameraInternal(cameraId, body);
}

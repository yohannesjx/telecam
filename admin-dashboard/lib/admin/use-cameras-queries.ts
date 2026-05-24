"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCamera,
  getCamera,
  getCameraStreamState,
  getSchoolCameras,
  getSchoolClassrooms,
  updateCamera,
} from "@/lib/admin/cameras-api";
import type { CreateCameraInput, UpdateCameraInput } from "@/lib/admin/cameras-types";
import type { UserRole } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSchoolCameraStatus } from "@/lib/admin/camera-monitoring-api";
import { listSchools } from "@/lib/admin/camera-monitoring-api";

export const SCHOOLS_QUERY_KEY = ["admin", "schools"] as const;
export const SCHOOL_CAMERAS_QUERY_KEY = ["admin", "school-cameras"] as const;
export const CAMERA_DETAIL_QUERY_KEY = ["admin", "camera-detail"] as const;
export const CLASSROOMS_QUERY_KEY = ["admin", "classrooms"] as const;
export const CAMERA_STREAM_STATE_KEY = ["admin", "camera-stream-state"] as const;

export function useSchoolsQuery() {
  return useQuery({
    queryKey: SCHOOLS_QUERY_KEY,
    queryFn: listSchools,
    staleTime: 60_000,
  });
}

export function useSchoolClassroomsQuery(schoolId: string | null) {
  return useQuery({
    queryKey: [...CLASSROOMS_QUERY_KEY, schoolId],
    queryFn: () => getSchoolClassrooms(schoolId!),
    enabled: Boolean(schoolId),
    staleTime: 60_000,
  });
}

export function useSchoolCamerasQuery(schoolId: string | null, withStatus = true) {
  return useQuery({
    queryKey: [...SCHOOL_CAMERAS_QUERY_KEY, schoolId, withStatus],
    queryFn: async () => {
      const cameras = await getSchoolCameras(schoolId!);
      if (!withStatus) return cameras;
      try {
        const status = await getSchoolCameraStatus(schoolId!);
        const statusMap = new Map(
          status.cameras.map((c) => [
            c.id,
            {
              id: c.id,
              desiredState: c.desiredState,
              scheduleReason: c.scheduleReason,
              lastSegmentAt: c.lastSegmentAt,
              openAlerts: c.openAlerts,
              status: c.rawStatus,
            },
          ]),
        );
        return cameras.map((camera) => {
          const s = statusMap.get(camera.id);
          if (!s) return camera;
          return {
            ...camera,
            desiredState: s.desiredState ?? camera.desiredState,
            scheduleReason: s.scheduleReason ?? camera.scheduleReason,
            lastSegmentAt: s.lastSegmentAt ?? camera.lastSegmentAt,
            openAlerts: s.openAlerts ?? camera.openAlerts,
          };
        });
      } catch {
        return cameras;
      }
    },
    enabled: Boolean(schoolId),
    refetchOnWindowFocus: true,
  });
}

export function useCameraDetailQuery(cameraId: string | null) {
  return useQuery({
    queryKey: [...CAMERA_DETAIL_QUERY_KEY, cameraId],
    queryFn: () => getCamera(cameraId!),
    enabled: Boolean(cameraId),
  });
}

export function useCameraStreamStateQuery(cameraId: string | null) {
  return useQuery({
    queryKey: [...CAMERA_STREAM_STATE_KEY, cameraId],
    queryFn: () => getCameraStreamState(cameraId!),
    enabled: Boolean(cameraId),
    refetchInterval: 20_000,
  });
}

export function useCreateCameraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, input }: { schoolId: string; input: CreateCameraInput }) =>
      createCamera(schoolId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SCHOOL_CAMERAS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: CAMERA_DETAIL_QUERY_KEY });
    },
  });
}

export function useUpdateCameraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cameraId, input }: { cameraId: string; input: UpdateCameraInput }) =>
      updateCamera(cameraId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: SCHOOL_CAMERAS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...CAMERA_DETAIL_QUERY_KEY, variables.cameraId],
      });
    },
  });
}

export function canManageCameras(role: UserRole | undefined): boolean {
  return hasPermission(role, "cameras:update");
}

export function canCreateCamera(role: UserRole | undefined): boolean {
  return hasPermission(role, "cameras:create");
}

"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getCameraHealthDetail,
  getSchoolCameraStatus,
  getSchedulerStatus,
  listSchools,
} from "@/lib/admin/camera-monitoring-api";

export const SCHOOLS_QUERY_KEY = ["admin", "schools"] as const;
export const CAMERA_STATUS_QUERY_KEY = ["admin", "camera-status"] as const;
export const CAMERA_HEALTH_QUERY_KEY = ["admin", "camera-health"] as const;
export const SCHEDULER_STATUS_QUERY_KEY = ["admin", "scheduler-status"] as const;

export const CAMERA_STATUS_REFETCH_MS = 15_000;
export const CAMERA_HEALTH_REFETCH_MS = 10_000;

export function useSchoolsQuery() {
  return useQuery({
    queryKey: SCHOOLS_QUERY_KEY,
    queryFn: listSchools,
    staleTime: 60_000,
  });
}

export function useSchoolCameraStatusQuery(schoolId: string | null) {
  return useQuery({
    queryKey: [...CAMERA_STATUS_QUERY_KEY, schoolId],
    queryFn: () => getSchoolCameraStatus(schoolId!),
    enabled: Boolean(schoolId),
    refetchInterval: CAMERA_STATUS_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useCameraHealthQuery(cameraId: string | null) {
  return useQuery({
    queryKey: [...CAMERA_HEALTH_QUERY_KEY, cameraId],
    queryFn: () => getCameraHealthDetail(cameraId!),
    enabled: Boolean(cameraId),
    refetchInterval: CAMERA_HEALTH_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useSchedulerStatusQuery(enabled = true) {
  return useQuery({
    queryKey: SCHEDULER_STATUS_QUERY_KEY,
    queryFn: getSchedulerStatus,
    enabled,
    staleTime: 30_000,
  });
}

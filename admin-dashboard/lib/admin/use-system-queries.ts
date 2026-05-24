"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getHealthSummary,
  getRetentionStatus,
  getSchedulerStatus,
  getStorageUsage,
  getWorkers,
} from "@/lib/admin/system-api";
import type { UserRole } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";

export const SYSTEM_OVERVIEW_REFETCH_MS = 30_000;
export const SYSTEM_WORKERS_REFETCH_MS = 30_000;
export const SYSTEM_SCHEDULER_REFETCH_MS = 30_000;
export const SYSTEM_STORAGE_REFETCH_MS = 60_000;
export const SYSTEM_RETENTION_REFETCH_MS = 60_000;

export function canViewSystem(role: UserRole | undefined): boolean {
  return hasPermission(role, "system:view");
}

export function canViewSystemWorkers(role: UserRole | undefined): boolean {
  return hasPermission(role, "system:view") && role !== "SCHOOL_ADMIN";
}

export function canViewSystemRetention(role: UserRole | undefined): boolean {
  return hasPermission(role, "system:view") && role !== "SCHOOL_ADMIN";
}

export function useWorkersQuery(enabled = true) {
  return useQuery({
    queryKey: ["admin", "system", "workers"],
    queryFn: getWorkers,
    enabled,
    refetchInterval: SYSTEM_WORKERS_REFETCH_MS,
    retry: (count, err) => {
      if (typeof err === "object" && err && "status" in err && (err as { status: number }).status === 403) {
        return false;
      }
      return count < 1;
    },
  });
}

export function useHealthSummaryQuery(enabled = true) {
  return useQuery({
    queryKey: ["admin", "system", "health-summary"],
    queryFn: getHealthSummary,
    enabled,
    refetchInterval: SYSTEM_OVERVIEW_REFETCH_MS,
  });
}

export function useSchedulerStatusQuery(enabled = true) {
  return useQuery({
    queryKey: ["admin", "system", "scheduler"],
    queryFn: getSchedulerStatus,
    enabled,
    refetchInterval: SYSTEM_SCHEDULER_REFETCH_MS,
  });
}

export function useRetentionStatusQuery(enabled = true) {
  return useQuery({
    queryKey: ["admin", "system", "retention"],
    queryFn: getRetentionStatus,
    enabled,
    refetchInterval: SYSTEM_RETENTION_REFETCH_MS,
    retry: (count, err) => {
      if (typeof err === "object" && err && "status" in err && (err as { status: number }).status === 403) {
        return false;
      }
      return count < 1;
    },
  });
}

export function useStorageUsageQuery(enabled = true, withSummary = true) {
  return useQuery({
    queryKey: ["admin", "system", "storage-usage", withSummary],
    queryFn: () => getStorageUsage(withSummary),
    enabled,
    refetchInterval: SYSTEM_STORAGE_REFETCH_MS,
  });
}

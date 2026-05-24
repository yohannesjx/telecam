import { apiFetch } from "@/lib/api";
import {
  normalizeHealthSummary,
  normalizeRetentionStatus,
  normalizeSchedulerStatus,
  normalizeStorageUsage,
  normalizeWorkers,
} from "@/lib/admin/system-normalizer";
import type {
  NormalizedHealthSummary,
  NormalizedRetentionStatus,
  NormalizedSchedulerStatus,
  NormalizedStorageUsageResponse,
  NormalizedWorker,
} from "@/lib/admin/system-types";

export async function getWorkers(): Promise<NormalizedWorker[]> {
  const raw = await apiFetch<unknown>("/admin/workers", { method: "GET" });
  return normalizeWorkers(raw);
}

export async function getHealthSummary(): Promise<NormalizedHealthSummary> {
  const raw = await apiFetch<unknown>("/admin/health/summary", { method: "GET" });
  return normalizeHealthSummary(raw);
}

export async function getSchedulerStatus(): Promise<NormalizedSchedulerStatus> {
  const raw = await apiFetch<unknown>("/admin/scheduler/status", { method: "GET" });
  return normalizeSchedulerStatus(raw);
}

export async function getRetentionStatus(): Promise<NormalizedRetentionStatus> {
  const raw = await apiFetch<unknown>("/admin/retention/status", { method: "GET" });
  return normalizeRetentionStatus(raw);
}

export async function getStorageUsage(withSummary = false): Promise<NormalizedStorageUsageResponse> {
  const qs = withSummary ? "?summary=true" : "";
  const raw = await apiFetch<unknown>(`/admin/storage-usage${qs}`, { method: "GET" });
  return normalizeStorageUsage(raw);
}

import type {
  NormalizedHealthSummary,
  NormalizedRetentionStatus,
  NormalizedSchedulerStatus,
  NormalizedWorker,
  SystemStatus,
} from "@/lib/admin/system-types";

export const WORKER_STALE_THRESHOLD_SECONDS = 120;

export function mapRawWorkerStatus(raw: string | null | undefined): import("@/lib/admin/system-types").WorkerStatus {
  const s = (raw ?? "").toUpperCase();
  if (s === "RUNNING") return "running";
  if (s === "HEALTHY") return "healthy";
  if (s === "DEGRADED") return "degraded";
  if (s === "STALE") return "stale";
  if (s === "STOPPED") return "stopped";
  if (s === "ERROR") return "error";
  return "unknown";
}

export function deriveWorkerStatus(
  rawStatus: string | null | undefined,
  stalenessSeconds: number | null | undefined,
  threshold = WORKER_STALE_THRESHOLD_SECONDS,
): import("@/lib/admin/system-types").WorkerStatus {
  const effective = (rawStatus ?? "").toUpperCase();
  if (effective) {
    const mapped = mapRawWorkerStatus(effective);
    if (mapped !== "unknown") return mapped;
  }
  if (stalenessSeconds !== null && stalenessSeconds !== undefined) {
    if (stalenessSeconds > threshold) return "stale";
    if (stalenessSeconds <= threshold) return "running";
  }
  return "unknown";
}

export function countWorkersByStatus(workers: NormalizedWorker[]): {
  healthy: number;
  stale: number;
  error: number;
  total: number;
} {
  let healthy = 0;
  let stale = 0;
  let error = 0;
  for (const w of workers) {
    if (w.status === "stale") stale += 1;
    else if (w.status === "error" || w.status === "stopped") error += 1;
    else if (w.status === "running" || w.status === "healthy") healthy += 1;
  }
  return { healthy, stale, error, total: workers.length };
}

export function deriveSystemStatusFromWorkers(workers: NormalizedWorker[]): SystemStatus {
  if (workers.length === 0) return "unknown";
  const { stale, error } = countWorkersByStatus(workers);
  if (error > 0) return "critical";
  if (stale > 0) return "warning";
  return "healthy";
}

export function computeHealthScore(
  summary: NormalizedHealthSummary | null,
  workers: NormalizedWorker[],
): number | null {
  let score = 100;
  if (summary?.criticalAlerts && summary.criticalAlerts > 0) {
    score -= Math.min(40, summary.criticalAlerts * 10);
  }
  if (summary?.camerasOffline && summary.camerasTotal) {
    const ratio = summary.camerasOffline / summary.camerasTotal;
    score -= Math.min(25, Math.round(ratio * 30));
  }
  const { stale, error } = countWorkersByStatus(workers);
  score -= stale * 8;
  score -= error * 15;
  if (workers.length === 0 && !summary) return null;
  return Math.max(0, Math.min(100, score));
}

export function deriveOverallSystemStatus(
  summary: NormalizedHealthSummary | null,
  workers: NormalizedWorker[],
  scheduler?: NormalizedSchedulerStatus | null,
  retention?: NormalizedRetentionStatus | null,
): SystemStatus {
  if (summary?.criticalAlerts && summary.criticalAlerts > 0) return "critical";
  const workerStatus = deriveSystemStatusFromWorkers(workers);
  if (workerStatus === "critical") return "critical";
  if (retention?.status === "critical" || scheduler?.status === "critical") return "critical";
  if (workerStatus === "warning") return "warning";
  if (summary?.openAlerts && summary.openAlerts > 5) return "warning";
  if (retention?.status === "warning" || scheduler?.status === "warning") return "warning";
  if (!summary && workers.length === 0) return "unknown";
  return "healthy";
}

export function schedulerSystemStatus(
  scheduler: NormalizedSchedulerStatus | null | undefined,
): SystemStatus {
  if (!scheduler?.currentState) return "unknown";
  return "healthy";
}

export function retentionSystemStatus(
  retention: NormalizedRetentionStatus | null | undefined,
): SystemStatus {
  if (!retention) return "unknown";
  const raw = (retention.message ?? retention.workerName ?? "").toUpperCase();
  if (retention.status === "critical") return "critical";
  if (retention.status === "warning") return "warning";
  if (raw.includes("UNKNOWN") || raw.includes("NO RETENTION")) return "warning";
  if (retention.dryRun) return "warning";
  return retention.status;
}

export function buildSystemNotes(
  summary: NormalizedHealthSummary | null,
  workers: NormalizedWorker[],
): string[] {
  const notes: string[] = [];
  if (summary?.criticalAlerts && summary.criticalAlerts > 0) {
    notes.push(`${summary.criticalAlerts} critical alert(s) open`);
  }
  if (summary?.camerasOffline && summary.camerasOffline > 0) {
    notes.push(`${summary.camerasOffline} camera(s) offline`);
  }
  const stale = workers.filter((w) => w.status === "stale");
  if (stale.length > 0) {
    notes.push(`Stale workers: ${stale.map((w) => w.name).join(", ")}`);
  }
  const stream = summary?.streamWorkerStatus;
  if (stream && stream.toUpperCase() === "STALE") {
    notes.push("Stream worker heartbeat is stale");
  }
  return notes;
}

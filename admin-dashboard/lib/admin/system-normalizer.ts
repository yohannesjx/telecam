import { sanitizeMetadataRecord } from "@/lib/admin/audit-logs-utils";
import {
  deriveWorkerStatus,
  retentionSystemStatus,
  schedulerSystemStatus,
} from "@/lib/admin/system-health";
import type {
  NormalizedHealthSummary,
  NormalizedRetentionStatus,
  NormalizedSchedulerStatus,
  NormalizedStorageUsage,
  NormalizedStorageUsageResponse,
  NormalizedWorker,
  StorageUsageSummary,
  SystemStatus,
} from "@/lib/admin/system-types";
import { estimateStorageCostUsd, estimateStorageCostUsdFromGb } from "@/lib/admin/storage-cost";

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

function num(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function bool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function unwrapPayload(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  if ("data" in raw) return raw.data;
  return raw;
}

function deriveHealthStatus(
  criticalAlerts: number | null,
  offlineCameras: number | null,
): SystemStatus {
  if (criticalAlerts && criticalAlerts > 0) return "critical";
  if (offlineCameras && offlineCameras > 0) return "warning";
  return "healthy";
}

export function normalizeHealthSummary(raw: unknown): NormalizedHealthSummary {
  const payload = unwrapPayload(raw);
  const root = isRecord(payload) ? payload : {};
  const criticalAlerts = num(pick(root, ["critical_alerts", "criticalAlerts"]));
  const camerasOffline = num(pick(root, ["cameras_offline", "camerasOffline"]));
  const openAlerts = num(pick(root, ["open_alerts", "openAlerts"]));

  return {
    status: deriveHealthStatus(criticalAlerts, camerasOffline),
    schoolsTotal: num(pick(root, ["schools_total", "schoolsTotal"])),
    camerasTotal: num(pick(root, ["cameras_total", "camerasTotal"])),
    camerasActive: num(pick(root, ["cameras_active", "camerasActive"])),
    camerasOffline,
    openAlerts,
    criticalAlerts,
    warningAlerts: null,
    streamWorkerStatus: str(pick(root, ["stream_worker_status", "streamWorkerStatus"])) ?? null,
    lastStreamWorkerSeenAt:
      str(pick(root, ["last_stream_worker_seen_at", "lastStreamWorkerSeenAt"])) ?? null,
    raw: payload,
  };
}

export function normalizeWorker(raw: unknown): NormalizedWorker {
  const row = isRecord(raw) ? raw : {};
  const rawStatus = str(pick(row, ["status", "effective_status", "effectiveStatus"])) ?? null;
  const stalenessSeconds = num(
    pick(row, ["seconds_since_last_seen", "secondsSinceLastSeen", "staleness_seconds"]),
  );
  const effectiveStatus = rawStatus;
  const status = deriveWorkerStatus(effectiveStatus, stalenessSeconds);
  const metaRaw = pick(row, ["metadata"]);
  const metadata =
    metaRaw && typeof metaRaw === "object"
      ? sanitizeMetadataRecord(metaRaw as Record<string, unknown>)
      : null;

  const workerType = str(pick(row, ["worker_type", "workerType"])) ?? null;
  const workerName =
    str(pick(row, ["worker_name", "workerName"])) ?? workerType ?? "Unknown worker";

  return {
    id: workerType ?? workerName,
    name: workerName,
    workerType,
    status,
    rawStatus,
    effectiveStatus,
    lastHeartbeatAt: str(pick(row, ["last_seen_at", "lastSeenAt", "last_heartbeat_at"])) ?? null,
    stalenessSeconds,
    instanceId: str(pick(row, ["instance_id", "instanceId"])) ?? null,
    version: str(pick(row, ["version"])) ?? null,
    metadata,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeWorkers(raw: unknown): NormalizedWorker[] {
  const payload = unwrapPayload(raw);
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["workers", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).map((row) => normalizeWorker(row));
}

export function normalizeSchedulerStatus(raw: unknown): NormalizedSchedulerStatus {
  const payload = unwrapPayload(raw);
  const root = isRecord(payload) ? payload : {};
  const days = root.recording_days ?? root.recordingDays;
  const currentState = str(pick(root, ["current_state", "currentState"]));
  const reason = str(pick(root, ["reason"]));

  let isSchoolHours: boolean | null = null;
  if (currentState) {
    isSchoolHours = currentState.toUpperCase() === "RUNNING";
  }

  const scheduler: NormalizedSchedulerStatus = {
    status: schedulerSystemStatus({ currentState } as NormalizedSchedulerStatus),
    timezone: str(pick(root, ["timezone"])) ?? null,
    recordingDays: Array.isArray(days) ? days.map(String) : null,
    schoolStartTime: str(pick(root, ["recording_start_time", "recordingStartTime"])) ?? null,
    schoolEndTime: str(pick(root, ["recording_end_time", "recordingEndTime"])) ?? null,
    currentState: currentState ?? null,
    isSchoolDay: null,
    isSchoolHours,
    runningCameras: num(pick(root, ["cameras_running_desired", "camerasRunningDesired"])),
    stoppedCameras: num(pick(root, ["cameras_stopped_desired", "camerasStoppedDesired"])),
    reason: reason ?? null,
    nextLiveWindowAt: str(pick(root, ["next_start_at", "nextStartAt"])) ?? null,
    nextStopAt: str(pick(root, ["next_stop_at", "nextStopAt"])) ?? null,
    raw: payload,
  };
  return scheduler;
}

export function normalizeRetentionStatus(raw: unknown): NormalizedRetentionStatus {
  const payload = unwrapPayload(raw);
  const root = isRecord(payload) ? payload : {};
  const metaRaw = pick(root, ["metadata"]);
  const meta =
    metaRaw && typeof metaRaw === "object"
      ? sanitizeMetadataRecord(metaRaw as Record<string, unknown>)
      : null;

  const statusRaw = str(pick(root, ["status"])) ?? "UNKNOWN";
  const message = str(pick(root, ["message"]));

  const retention: NormalizedRetentionStatus = {
    status: "unknown",
    workerName: str(pick(root, ["worker_name", "workerName"])) ?? null,
    message: message ?? null,
    dryRun: bool(pick(root, ["dry_run", "dryRun"])) ?? bool(meta?.dry_run) ?? bool(meta?.dryRun),
    lastRunAt:
      str(pick(root, ["last_seen_at", "lastSeenAt", "last_run_at", "lastRunAt"])) ?? null,
    nextRunAt: str(pick(root, ["next_run_at", "nextRunAt"])) ?? null,
    deletedSegmentsCount: num(pick(root, ["deleted_segments_count", "deletedSegmentsCount"])) ??
      num(meta?.deleted_segments_count) ??
      num(meta?.deleted_count),
    failedDeletionsCount: num(pick(root, ["failed_deletions_count", "failedDeletionsCount"])) ??
      num(meta?.failed_deletions_count),
    expiredSegmentsCount: num(pick(root, ["expired_segments_count", "expiredSegmentsCount"])) ??
      num(meta?.expired_segments_count),
    tempPlaybackDeletedCount:
      num(pick(root, ["temp_playback_deleted_count", "tempPlaybackDeletedCount"])) ??
      num(meta?.temp_playback_deleted_count),
    retentionDays: num(pick(root, ["retention_days", "retentionDays"])) ?? num(meta?.retention_days),
    tempPlaybackRetentionMinutes:
      num(pick(root, ["temp_playback_retention_minutes", "tempPlaybackRetentionMinutes"])) ??
      num(meta?.temp_playback_retention_minutes),
    raw: payload,
  };

  const upper = statusRaw.toUpperCase();
  if (upper === "ERROR") retention.status = "critical";
  else if (upper === "UNKNOWN" || message) retention.status = retentionSystemStatus(retention);
  else if (upper === "RUNNING" || upper === "HEALTHY") retention.status = "healthy";
  else if (upper === "STALE" || upper === "DEGRADED") retention.status = "warning";
  else retention.status = retentionSystemStatus(retention);

  return retention;
}

export function normalizeStorageUsageRow(raw: unknown): NormalizedStorageUsage {
  const row = isRecord(raw) ? raw : {};
  const bytes = num(pick(row, ["total_bytes", "totalBytes", "bytes_used", "bytesUsed"]));
  const gb = num(pick(row, ["total_gb", "totalGb", "gb_used", "gbUsed"]));
  const schoolId = str(pick(row, ["school_id", "schoolId"])) ?? null;
  const date = str(pick(row, ["date"])) ?? null;
  const estimated =
    num(pick(row, ["estimated_cost_usd", "estimatedCostUsd", "estimatedCostUSD"])) ??
    estimateStorageCostUsd(bytes ?? undefined) ??
    estimateStorageCostUsdFromGb(gb ?? undefined);

  return {
    id: schoolId && date ? `${schoolId}-${date}` : schoolId ?? undefined,
    schoolId,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    date,
    bytesUsed: bytes,
    gbUsed: gb,
    segmentCount: num(pick(row, ["segment_count", "segmentCount"])),
    estimatedCostUsd: estimated,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeStorageUsage(raw: unknown): NormalizedStorageUsageResponse {
  const root = isRecord(raw) ? raw : {};
  const payload = unwrapPayload(raw);
  const summaryRaw = isRecord(root.summary) ? root.summary : null;

  const rowsSource = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["storage_usage", "storageUsage", "usage", "data", "rows"])
      : isRecord(root) && Array.isArray(root.data)
        ? root.data
        : [];

  const rows = Array.isArray(rowsSource)
    ? rowsSource.filter(isRecord).map((r) => normalizeStorageUsageRow(r))
    : [];

  let summary: StorageUsageSummary | null = null;
  if (summaryRaw) {
    summary = {
      totalBytes: num(pick(summaryRaw, ["total_bytes", "totalBytes"])) ?? 0,
      totalGb: num(pick(summaryRaw, ["total_gb", "totalGb"])) ?? 0,
      totalSegments: num(pick(summaryRaw, ["total_segments", "totalSegments"])) ?? 0,
      schoolsCount: num(pick(summaryRaw, ["schools_count", "schoolsCount"])) ?? 0,
      estimatedCostUsd: num(pick(summaryRaw, ["estimated_cost_usd", "estimatedCostUsd"])) ?? 0,
      rowCount: num(pick(summaryRaw, ["rows", "row_count"])) ?? rows.length,
    };
  } else if (rows.length > 0) {
    const schoolIds = new Set<string>();
    let totalBytes = 0;
    let totalSegments = 0;
    let estimatedCostUsd = 0;
    for (const row of rows) {
      if (row.schoolId) schoolIds.add(row.schoolId);
      totalBytes += row.bytesUsed ?? 0;
      totalSegments += row.segmentCount ?? 0;
      estimatedCostUsd += row.estimatedCostUsd ?? 0;
    }
    summary = {
      totalBytes,
      totalGb: totalBytes / 1024 ** 3,
      totalSegments,
      schoolsCount: schoolIds.size,
      estimatedCostUsd:
        (estimatedCostUsd || estimateStorageCostUsd(totalBytes)) ?? 0,
      rowCount: rows.length,
    };
  }

  return { rows, summary };
}

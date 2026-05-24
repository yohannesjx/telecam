export type SystemStatus = "healthy" | "warning" | "critical" | "unknown";

export type WorkerStatus =
  | "running"
  | "healthy"
  | "degraded"
  | "stale"
  | "stopped"
  | "error"
  | "unknown";

export type NormalizedWorker = {
  id?: string;
  name: string;
  workerType?: string | null;
  status: WorkerStatus;
  rawStatus?: string | null;
  effectiveStatus?: string | null;
  lastHeartbeatAt?: string | null;
  stalenessSeconds?: number | null;
  instanceId?: string | null;
  version?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedAt?: string | null;
};

export type NormalizedHealthSummary = {
  status: SystemStatus;
  score?: number | null;
  schoolsTotal?: number | null;
  camerasTotal?: number | null;
  camerasActive?: number | null;
  camerasOffline?: number | null;
  openAlerts?: number | null;
  criticalAlerts?: number | null;
  warningAlerts?: number | null;
  streamWorkerStatus?: string | null;
  lastStreamWorkerSeenAt?: string | null;
  notes?: string[];
  raw?: unknown;
};

export type NormalizedSchedulerStatus = {
  status: SystemStatus;
  timezone?: string | null;
  recordingDays?: string[] | null;
  schoolStartTime?: string | null;
  schoolEndTime?: string | null;
  currentTime?: string | null;
  currentState?: string | null;
  isSchoolDay?: boolean | null;
  isSchoolHours?: boolean | null;
  runningCameras?: number | null;
  stoppedCameras?: number | null;
  reason?: string | null;
  lastRunAt?: string | null;
  nextLiveWindowAt?: string | null;
  nextStopAt?: string | null;
  raw?: unknown;
};

export type NormalizedRetentionStatus = {
  status: SystemStatus;
  workerName?: string | null;
  message?: string | null;
  dryRun?: boolean | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  deletedSegmentsCount?: number | null;
  failedDeletionsCount?: number | null;
  expiredSegmentsCount?: number | null;
  tempPlaybackDeletedCount?: number | null;
  retentionDays?: number | null;
  tempPlaybackRetentionMinutes?: number | null;
  raw?: unknown;
};

export type NormalizedStorageUsage = {
  id?: string;
  schoolId?: string | null;
  schoolName?: string | null;
  date?: string | null;
  bytesUsed?: number | null;
  gbUsed?: number | null;
  segmentCount?: number | null;
  estimatedCostUsd?: number | null;
  updatedAt?: string | null;
};

export type StorageUsageSummary = {
  totalBytes: number;
  totalGb: number;
  totalSegments: number;
  schoolsCount: number;
  estimatedCostUsd: number;
  rowCount: number;
};

export type NormalizedStorageUsageResponse = {
  rows: NormalizedStorageUsage[];
  summary?: StorageUsageSummary | null;
};

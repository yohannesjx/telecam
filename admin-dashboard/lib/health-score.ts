import type { HealthLevel, HealthScoreResult, NormalizedDashboard } from "@/lib/admin/dashboard-types";

export function calculateHealthScore(data: NormalizedDashboard): HealthScoreResult {
  let score = 100;

  const criticalAlerts = data.criticalAlerts;
  const openAlerts = data.openAlerts;
  const offlineCameras = data.camerasOffline;
  const staleWorkers = data.workersStale;
  const camerasTotal = data.camerasTotal;
  const camerasHealthyPercent = data.camerasHealthyPercent ?? 0;

  if (criticalAlerts > 0) score -= 30;
  if (openAlerts > 0) score -= Math.min(openAlerts * 5, 25);
  if (offlineCameras > 0) score -= Math.min(offlineCameras * 5, 25);
  if (staleWorkers > 0) score -= Math.min(staleWorkers * 15, 30);
  if (camerasTotal > 0 && camerasHealthyPercent < 80) score -= 15;

  score = Math.max(0, Math.min(100, score));

  let level: HealthLevel = "critical";
  let label = "Critical";
  if (score >= 90) {
    level = "good";
    label = "Good";
  } else if (score >= 70) {
    level = "warning";
    label = "Warning";
  }

  return { score, level, label };
}

export function workerSummaryLabel(data: NormalizedDashboard): string {
  if (data.workersTotal <= 0) return "Unknown";
  if (data.workersStale > 0) {
    return `${data.workersStale} stale worker${data.workersStale === 1 ? "" : "s"}`;
  }
  if (data.workersHealthy >= data.workersTotal) return "All workers healthy";
  return `${data.workersTotal - data.workersHealthy} worker issue(s)`;
}

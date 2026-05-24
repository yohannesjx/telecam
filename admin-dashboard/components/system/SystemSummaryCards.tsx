import {
  AlertTriangle,
  CalendarClock,
  Database,
  HeartPulse,
  Server,
  Trash2,
  Users,
} from "lucide-react";

import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import type { SystemStatus } from "@/lib/admin/system-types";
import { formatMoneyUsd, formatNumber } from "@/lib/format";

type SystemSummaryCardsProps = {
  overallStatus: SystemStatus;
  score?: number | null;
  healthyWorkers?: number | null;
  staleWorkers?: number | null;
  criticalAlerts?: number | null;
  schedulerState?: string | null;
  retentionStatus?: SystemStatus | null;
  retentionDryRun?: boolean | null;
  storageGb?: number | null;
  estimatedCostUsd?: number | null;
};

function statusLabel(status: SystemStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function SystemSummaryCards({
  overallStatus,
  score,
  healthyWorkers,
  staleWorkers,
  criticalAlerts,
  schedulerState,
  retentionStatus,
  retentionDryRun,
  storageGb,
  estimatedCostUsd,
}: SystemSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <DashboardMetricCard
        label="Overall system status"
        value={statusLabel(overallStatus)}
        icon={HeartPulse}
      />
      <DashboardMetricCard
        label="Health score"
        value={score != null ? `${Math.round(score)}%` : "N/A"}
        icon={HeartPulse}
      />
      <DashboardMetricCard
        label="Healthy workers"
        value={formatNumber(healthyWorkers ?? 0)}
        icon={Users}
      />
      <DashboardMetricCard
        label="Stale workers"
        value={formatNumber(staleWorkers ?? 0)}
        icon={Server}
      />
      <DashboardMetricCard
        label="Critical alerts"
        value={formatNumber(criticalAlerts ?? 0)}
        icon={AlertTriangle}
      />
      <DashboardMetricCard
        label="Scheduler state"
        value={schedulerState ?? "Unknown"}
        icon={CalendarClock}
      />
      <DashboardMetricCard
        label="Retention status"
        value={
          retentionDryRun
            ? "Dry run"
            : retentionStatus
              ? statusLabel(retentionStatus)
              : "Unknown"
        }
        icon={Trash2}
      />
      <DashboardMetricCard
        label="Storage / est. cost"
        value={
          storageGb != null
            ? `${storageGb.toFixed(1)} GB · ${formatMoneyUsd(estimatedCostUsd)}/mo`
            : "N/A"
        }
        icon={Database}
      />
    </div>
  );
}

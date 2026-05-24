import type { NormalizedCameraHealth } from "@/lib/admin/camera-monitoring-types";
import { CameraStatusBadge } from "@/components/camera-monitoring/CameraStatusBadge";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { cameraOperationalStatusLabel, formatDateTime, formatNumber } from "@/lib/format";
import { Activity, AlertTriangle, Clock, Gauge, Video } from "lucide-react";

type CameraHealthCardsProps = {
  health: NormalizedCameraHealth;
};

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

export function CameraHealthCards({ health }: CameraHealthCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <DashboardMetricCard
        label="Status"
        value={cameraOperationalStatusLabel(health.status)}
        badge={<CameraStatusBadge status={health.status} />}
        icon={Activity}
      />
      <DashboardMetricCard
        label="Desired state"
        value={display(health.desiredState)}
        icon={Video}
      />
      <DashboardMetricCard
        label="Schedule reason"
        value={display(health.scheduleReason)}
        icon={Clock}
      />
      <DashboardMetricCard
        label="Last segment time"
        value={formatDateTime(health.lastSegmentAt)}
        icon={Clock}
      />
      <DashboardMetricCard
        label="Stream lag (seconds)"
        value={display(health.streamLagSeconds)}
        icon={Gauge}
      />
      <DashboardMetricCard
        label="Last segment age (minutes)"
        value={display(health.lastSegmentAgeMinutes)}
        icon={Clock}
      />
      <DashboardMetricCard
        label="Open alerts"
        value={formatNumber(health.openAlertsCount)}
        icon={AlertTriangle}
      />
      <DashboardMetricCard
        label="Last health event"
        value={display(health.lastHealthEvent)}
        icon={Activity}
      />
    </div>
  );
}

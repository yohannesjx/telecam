import type { CameraStatusSummary } from "@/lib/admin/camera-monitoring-types";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { formatNumber } from "@/lib/format";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CircleOff,
  Clock,
  Video,
} from "lucide-react";

type CameraStatusSummaryCardsProps = {
  summary: CameraStatusSummary;
};

export function CameraStatusSummaryCards({ summary }: CameraStatusSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <DashboardMetricCard
        label="Total cameras"
        value={formatNumber(summary.total)}
        icon={Camera}
      />
      <DashboardMetricCard
        label="Online cameras"
        value={formatNumber(summary.online)}
        icon={Video}
      />
      <DashboardMetricCard
        label="Offline cameras"
        value={formatNumber(summary.offline)}
        icon={CameraOff}
      />
      <DashboardMetricCard
        label="Stopped by schedule"
        value={formatNumber(summary.stoppedBySchedule)}
        icon={Clock}
      />
      <DashboardMetricCard
        label="No recent segment"
        value={formatNumber(summary.noRecentSegment)}
        icon={AlertTriangle}
      />
      <DashboardMetricCard
        label="Error cameras"
        value={formatNumber(summary.error)}
        icon={CircleOff}
      />
      <DashboardMetricCard
        label="Open alerts"
        value={formatNumber(summary.openAlerts)}
        icon={AlertTriangle}
      />
    </div>
  );
}

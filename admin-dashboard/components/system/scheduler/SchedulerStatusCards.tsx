import { Badge } from "@/components/ui/badge";
import type { NormalizedSchedulerStatus } from "@/lib/admin/system-types";
import { formatDateTime, formatNumber } from "@/lib/format";

import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { SystemStatusBadge } from "@/components/system/SystemStatusBadge";
import { CalendarClock, Camera, Clock, Globe } from "lucide-react";

type SchedulerStatusCardsProps = {
  scheduler: NormalizedSchedulerStatus;
};

function scheduleBadgeLabel(scheduler: NormalizedSchedulerStatus): string {
  if (scheduler.isSchoolHours === true) return "School hours active";
  if (scheduler.currentState?.toUpperCase() === "STOPPED") {
    const reason = (scheduler.reason ?? "").toLowerCase();
    if (reason.includes("weekend")) return "Weekend";
    if (reason.includes("hour") || reason.includes("outside")) return "Outside school hours";
    return "Outside school hours";
  }
  if (scheduler.currentState?.toUpperCase() === "RUNNING") return "School hours active";
  return "Unknown";
}

export function SchedulerStatusCards({ scheduler }: SchedulerStatusCardsProps) {
  const badgeLabel = scheduleBadgeLabel(scheduler);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SystemStatusBadge status={scheduler.status} />
        <Badge variant="secondary">{badgeLabel}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard label="Timezone" value={scheduler.timezone ?? "Unknown"} icon={Globe} />
        <DashboardMetricCard
          label="Cameras RUNNING"
          value={formatNumber(scheduler.runningCameras ?? 0)}
          icon={Camera}
        />
        <DashboardMetricCard
          label="Cameras STOPPED"
          value={formatNumber(scheduler.stoppedCameras ?? 0)}
          icon={Camera}
        />
        <DashboardMetricCard
          label="Next live window"
          value={formatDateTime(scheduler.nextLiveWindowAt)}
          icon={Clock}
        />
      </div>
      <DashboardMetricCard
        label="Schedule reason"
        value={scheduler.reason ?? scheduler.currentState ?? "Unknown"}
        icon={CalendarClock}
      />
    </div>
  );
}

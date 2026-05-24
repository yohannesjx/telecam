import type { HealthScoreResult } from "@/lib/admin/dashboard-types";
import { formatPercent } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Activity } from "lucide-react";

type SystemHealthCardProps = {
  health: HealthScoreResult;
};

export function SystemHealthCard({ health }: SystemHealthCardProps) {
  return (
    <StatCard
      featured
      label="System Health Score"
      value={formatPercent(health.score, "N/A")}
      hint="Calculated from live metrics"
      icon={Activity}
      progress={health.score ?? undefined}
      badge={
        <StatusBadge label={health.label} healthLevel={health.level} />
      }
    />
  );
}

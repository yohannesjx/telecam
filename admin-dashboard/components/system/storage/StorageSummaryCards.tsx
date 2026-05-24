import { Building2, Database, DollarSign, FileStack, TrendingUp } from "lucide-react";

import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import type { StorageUsageSummary } from "@/lib/admin/system-types";
import { formatBytes, formatMoneyUsd, formatNumber } from "@/lib/format";

type StorageSummaryCardsProps = {
  summary: StorageUsageSummary | null | undefined;
  oldestDate?: string | null;
  dailyGrowthGb?: number | null;
};

export function StorageSummaryCards({ summary, oldestDate, dailyGrowthGb }: StorageSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <DashboardMetricCard
        label="Total storage"
        value={summary ? formatBytes(summary.totalBytes) : "N/A"}
        icon={Database}
      />
      <DashboardMetricCard
        label="Total segments"
        value={formatNumber(summary?.totalSegments ?? 0)}
        icon={FileStack}
      />
      <DashboardMetricCard
        label="Schools using storage"
        value={formatNumber(summary?.schoolsCount ?? 0)}
        icon={Building2}
      />
      <DashboardMetricCard
        label="Est. monthly cost"
        value={formatMoneyUsd(summary?.estimatedCostUsd)}
        hint="Estimate only"
        icon={DollarSign}
      />
      <DashboardMetricCard
        label="Est. daily growth"
        value={dailyGrowthGb != null ? `${dailyGrowthGb.toFixed(2)} GB` : "N/A"}
        hint={oldestDate ? `Oldest row: ${oldestDate}` : undefined}
        icon={TrendingUp}
      />
    </div>
  );
}

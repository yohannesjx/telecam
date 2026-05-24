import { Archive, Clock, FileWarning, Trash2 } from "lucide-react";

import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { SystemStatusBadge } from "@/components/system/SystemStatusBadge";
import type { NormalizedRetentionStatus } from "@/lib/admin/system-types";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type RetentionStatusCardsProps = {
  retention: NormalizedRetentionStatus;
};

export function RetentionStatusCards({ retention }: RetentionStatusCardsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SystemStatusBadge status={retention.status} />
        {retention.dryRun ? <Badge variant="secondary">Dry run</Badge> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          label="Expired segments pending"
          value={formatNumber(retention.expiredSegmentsCount ?? 0)}
          icon={FileWarning}
        />
        <DashboardMetricCard
          label="Deleted segments"
          value={formatNumber(retention.deletedSegmentsCount ?? 0)}
          icon={Trash2}
        />
        <DashboardMetricCard
          label="Failed deletions"
          value={formatNumber(retention.failedDeletionsCount ?? 0)}
          icon={Archive}
        />
        <DashboardMetricCard
          label="Last retention run"
          value={formatDateTime(retention.lastRunAt)}
          icon={Clock}
        />
      </div>
    </div>
  );
}

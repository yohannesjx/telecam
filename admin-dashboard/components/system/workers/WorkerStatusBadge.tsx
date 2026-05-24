import { Badge } from "@/components/ui/badge";
import type { WorkerStatus } from "@/lib/admin/system-types";
import { cn } from "@/lib/utils";

const LABELS: Record<WorkerStatus, string> = {
  running: "Running",
  healthy: "Healthy",
  degraded: "Degraded",
  stale: "Stale",
  stopped: "Stopped",
  error: "Error",
  unknown: "Unknown",
};

const VARIANTS: Record<WorkerStatus, string> = {
  running: "border-emerald-200 bg-emerald-50 text-emerald-800",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  degraded: "border-amber-200 bg-amber-50 text-amber-800",
  stale: "border-amber-200 bg-amber-50 text-amber-800",
  stopped: "border-red-200 bg-red-50 text-red-800",
  error: "border-red-200 bg-red-50 text-red-800",
  unknown: "border-border bg-muted text-muted-foreground",
};

type WorkerStatusBadgeProps = {
  status: WorkerStatus;
  rawStatus?: string | null;
  className?: string;
};

export function WorkerStatusBadge({ status, rawStatus, className }: WorkerStatusBadgeProps) {
  const label =
    rawStatus && rawStatus.toUpperCase() !== status.toUpperCase()
      ? `${LABELS[status]} (${rawStatus})`
      : LABELS[status];
  return (
    <Badge variant="secondary" className={cn("font-normal", VARIANTS[status], className)}>
      {label}
    </Badge>
  );
}

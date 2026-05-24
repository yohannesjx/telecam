import { Badge } from "@/components/ui/badge";
import type { SystemStatus } from "@/lib/admin/system-types";
import { cn } from "@/lib/utils";

const LABELS: Record<SystemStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
  unknown: "Unknown",
};

const VARIANTS: Record<SystemStatus, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  critical: "border-red-200 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  unknown: "border-border bg-muted text-muted-foreground",
};

type SystemStatusBadgeProps = {
  status: SystemStatus;
  className?: string;
};

export function SystemStatusBadge({ status, className }: SystemStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-normal", VARIANTS[status], className)}>
      {LABELS[status]}
    </Badge>
  );
}

import type { AlertStatus } from "@/lib/admin/alerts-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<AlertStatus, string> = {
  open: "border-red-200 bg-red-50 text-red-800",
  acknowledged: "border-amber-200 bg-amber-50 text-amber-800",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  unknown: "border-border bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<AlertStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  unknown: "Unknown",
};

export function AlertStatusBadge({
  status,
  className,
}: {
  status: AlertStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STATUS_CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

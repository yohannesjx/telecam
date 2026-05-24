import type { AlertSeverity } from "@/lib/admin/alerts-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  unknown: "border-border bg-muted text-muted-foreground",
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
  unknown: "Unknown",
};

export function AlertSeverityBadge({
  severity,
  className,
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(SEVERITY_CLASS[severity], className)}>
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

import type { SchoolStatus } from "@/lib/admin/schools-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<SchoolStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DISABLED: "border-border bg-muted text-muted-foreground",
  UNKNOWN: "border-border bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<SchoolStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  UNKNOWN: "Unknown",
};

export function SchoolStatusBadge({
  status,
  className,
}: {
  status: SchoolStatus | string;
  className?: string;
}) {
  const key = (String(status).toUpperCase() as SchoolStatus) in STATUS_LABEL
    ? (String(status).toUpperCase() as SchoolStatus)
    : "UNKNOWN";
  return (
    <Badge variant="outline" className={cn(STATUS_CLASS[key], className)}>
      {STATUS_LABEL[key]}
    </Badge>
  );
}

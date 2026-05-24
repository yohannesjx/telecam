import type { EntityStatus } from "@/lib/admin/classrooms-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<EntityStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DISABLED: "border-border bg-muted text-muted-foreground",
  UNKNOWN: "border-border bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<EntityStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  UNKNOWN: "Unknown",
};

export function EntityStatusBadge({
  status,
  className,
}: {
  status: EntityStatus | string;
  className?: string;
}) {
  const key = (String(status).toUpperCase() as EntityStatus) in STATUS_LABEL
    ? (String(status).toUpperCase() as EntityStatus)
    : "UNKNOWN";
  return (
    <Badge variant="outline" className={cn(STATUS_CLASS[key], className)}>
      {STATUS_LABEL[key]}
    </Badge>
  );
}

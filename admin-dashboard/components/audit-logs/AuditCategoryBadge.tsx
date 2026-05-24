import { Badge } from "@/components/ui/badge";
import type { AuditLogCategory } from "@/lib/admin/audit-logs-types";
import { cn } from "@/lib/utils";

const LABELS: Record<AuditLogCategory, string> = {
  auth: "Auth",
  playback: "Playback",
  admin: "Admin",
  camera: "Camera",
  school: "School",
  billing: "Billing",
  alert: "Alert",
  system: "System",
  other: "Other",
};

const VARIANTS: Record<AuditLogCategory, string> = {
  auth: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  playback: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  admin: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  camera: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  school: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  billing: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  alert: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  system: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  other: "bg-muted text-muted-foreground",
};

type AuditCategoryBadgeProps = {
  category: AuditLogCategory;
  className?: string;
};

export function AuditCategoryBadge({ category, className }: AuditCategoryBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-normal", VARIANTS[category], className)}>
      {LABELS[category]}
    </Badge>
  );
}

import { AuditCategoryBadge } from "@/components/audit-logs/AuditCategoryBadge";
import type { AuditLogCategory } from "@/lib/admin/audit-logs-types";

type AuditActionBadgeProps = {
  action: string;
  category: AuditLogCategory;
};

export function AuditActionBadge({ action, category }: AuditActionBadgeProps) {
  return (
    <div className="flex flex-col gap-1">
      <AuditCategoryBadge category={category} />
      <span className="font-mono text-xs text-foreground">{action}</span>
    </div>
  );
}

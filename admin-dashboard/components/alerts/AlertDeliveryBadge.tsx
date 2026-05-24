import { Badge } from "@/components/ui/badge";
import { mapDeliveryDisplayStatus } from "@/lib/admin/alerts-normalizer";
import { cn } from "@/lib/utils";

const DISPLAY_CLASS = {
  sent: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  failed: "border-red-200 bg-red-50 text-red-800",
  not_sent: "border-border bg-muted text-muted-foreground",
  na: "border-border bg-muted text-muted-foreground",
} as const;

const DISPLAY_LABEL = {
  sent: "Sent",
  pending: "Pending",
  failed: "Failed",
  not_sent: "Not sent",
  na: "N/A",
} as const;

type AlertDeliveryBadgeProps = {
  status?: string | null;
  summary?: string;
  className?: string;
};

export function AlertDeliveryBadge({ status, summary, className }: AlertDeliveryBadgeProps) {
  if (summary) {
    return (
      <Badge variant="outline" className={cn("max-w-[220px] truncate font-normal", className)}>
        {summary}
      </Badge>
    );
  }

  const display = mapDeliveryDisplayStatus(status);
  return (
    <Badge variant="outline" className={cn(DISPLAY_CLASS[display], className)}>
      {DISPLAY_LABEL[display]}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  TRIAL: "border-sky-200 bg-sky-50 text-sky-800",
  PENDING: "border-amber-200 bg-amber-50 text-amber-900",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  OPEN: "border-amber-200 bg-amber-50 text-amber-900",
  REJECTED: "border-red-200 bg-red-50 text-red-800",
  VOID: "border-border bg-muted text-muted-foreground",
  VOIDED: "border-border bg-muted text-muted-foreground",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  PAST_DUE: "border-orange-200 bg-orange-50 text-orange-900",
  BLOCKED: "border-red-200 bg-red-50 text-red-800",
  OVERDUE: "border-red-200 bg-red-50 text-red-800",
};

export function BillingStatusBadge({ status }: { status: string }) {
  const key = String(status).toUpperCase();
  return (
    <Badge variant="outline" className={cn(STATUS_CLASS[key] ?? "border-border bg-muted")}>
      {key.replace(/_/g, " ")}
    </Badge>
  );
}

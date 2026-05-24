import { Badge } from "@/components/ui/badge";
import type { ParentStatus } from "@/lib/admin/parents-types";

export function ParentStatusBadge({ status }: { status: ParentStatus | string }) {
  const key = String(status).toUpperCase();
  if (key === "ACTIVE") return <Badge className="bg-emerald-600">Active</Badge>;
  if (key === "BLOCKED") return <Badge variant="secondary">Blocked</Badge>;
  if (key === "DISABLED") return <Badge variant="outline">Disabled</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

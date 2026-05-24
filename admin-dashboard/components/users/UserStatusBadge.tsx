import { Badge } from "@/components/ui/badge";
import type { ManagedUserStatus } from "@/lib/admin/users-types";

export function UserStatusBadge({ status }: { status: ManagedUserStatus | string }) {
  const key = String(status).toUpperCase();
  if (key === "ACTIVE") return <Badge className="bg-emerald-600">Active</Badge>;
  if (key === "BLOCKED") return <Badge variant="destructive">Blocked</Badge>;
  if (key === "DISABLED") return <Badge variant="secondary">Disabled</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

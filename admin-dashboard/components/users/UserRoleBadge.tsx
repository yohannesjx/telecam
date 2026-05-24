import { Badge } from "@/components/ui/badge";
import type { ManagedUserRole } from "@/lib/admin/users-types";

export function UserRoleBadge({ role }: { role: ManagedUserRole | string }) {
  const key = String(role).toUpperCase();
  if (key === "SUPER_ADMIN") return <Badge className="bg-indigo-600">Super Admin</Badge>;
  if (key === "SCHOOL_ADMIN") return <Badge className="bg-sky-600">School Admin</Badge>;
  if (key === "TECHNICIAN") return <Badge variant="outline">Technician</Badge>;
  return <Badge variant="outline">{key.replace(/_/g, " ")}</Badge>;
}

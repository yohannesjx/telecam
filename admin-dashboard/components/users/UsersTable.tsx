"use client";

import Link from "next/link";

import { UserRoleBadge } from "@/components/users/UserRoleBadge";
import { UserStatusBadge } from "@/components/users/UserStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import type { NormalizedUser } from "@/lib/admin/users-types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type UsersTableProps = {
  users: NormalizedUser[];
  schoolNames: Record<string, string>;
};

function schoolLabel(user: NormalizedUser, schoolNames: Record<string, string>): string {
  if (user.schoolIds.length === 0) return "—";
  return user.schoolIds.map((id) => schoolNames[id] ?? id.slice(0, 8)).join(", ");
}

export function UsersTable({ users, schoolNames }: UsersTableProps) {
  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Schools</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Force change</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.email ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <UserRoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <UserStatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{schoolLabel(user, schoolNames)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.forcePasswordChange ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.createdAt ? formatDateTime(user.createdAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/users/${user.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

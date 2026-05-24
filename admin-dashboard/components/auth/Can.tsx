"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import type { Permission } from "@/lib/auth/permissions";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/lib/auth/permissions";

type CanProps = {
  permission?: Permission;
  permissions?: Permission[];
  mode?: "any" | "all";
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({
  permission,
  permissions,
  mode = "any",
  children,
  fallback = null,
}: CanProps) {
  const { user } = useAuth();

  let allowed = false;
  if (permissions && permissions.length > 0) {
    allowed =
      mode === "all"
        ? hasAllPermissions(user?.role, permissions)
        : hasAnyPermission(user?.role, permissions);
  } else if (permission) {
    allowed = hasPermission(user?.role, permission);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}

"use client";

import { usePathname } from "next/navigation";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { useAuth } from "@/lib/auth/auth-context";
import { getRoutePermission } from "@/lib/auth/page-permissions";
import { hasPermission } from "@/lib/auth/permissions";

type RequirePermissionProps = {
  children: React.ReactNode;
};

export function RequirePermission({ children }: RequirePermissionProps) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const required = getRoutePermission(pathname);
  if (!required) {
    return <>{children}</>;
  }

  if (!hasPermission(user?.role, required)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

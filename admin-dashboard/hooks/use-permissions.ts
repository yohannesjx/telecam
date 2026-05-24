"use client";

import { useAuth } from "@/lib/auth/auth-context";
import type { Permission } from "@/lib/auth/permissions";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/lib/auth/permissions";

export function useCan(permission: Permission): boolean {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}

export function useCanAny(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return hasAnyPermission(user?.role, permissions);
}

export function useCanAll(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return hasAllPermissions(user?.role, permissions);
}

import type { UserRole } from "@/lib/auth/types";

export type DashboardRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TECHNICIAN";

export type Permission =
  | "dashboard:view"
  | "cameraMonitoring:view"
  | "alerts:view"
  | "alerts:manage"
  | "cameras:view"
  | "cameras:create"
  | "cameras:update"
  | "schools:view"
  | "schools:create"
  | "schools:update"
  | "schoolAdmins:manage"
  | "revenueShare:view"
  | "revenueShare:manage"
  | "classrooms:view"
  | "classrooms:create"
  | "classrooms:update"
  | "children:view"
  | "children:create"
  | "children:update"
  | "parents:view"
  | "parents:create"
  | "parents:linkChildren"
  | "billing:view"
  | "billing:manage"
  | "auditLogs:view"
  | "system:view"
  | "settings:view"
  | "users:view"
  | "users:create"
  | "users:update"
  | "users:resetPassword"
  | "users:changeRole"
  | "users:disable"
  | "auth:changeOwnPassword";

export const ROLE_PERMISSIONS: Record<DashboardRole, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "cameraMonitoring:view",
    "alerts:view",
    "alerts:manage",
    "cameras:view",
    "cameras:create",
    "cameras:update",
    "schools:view",
    "schools:create",
    "schools:update",
    "schoolAdmins:manage",
    "revenueShare:view",
    "revenueShare:manage",
    "classrooms:view",
    "classrooms:create",
    "classrooms:update",
    "children:view",
    "children:create",
    "children:update",
    "parents:view",
    "parents:create",
    "parents:linkChildren",
    "billing:view",
    "billing:manage",
    "auditLogs:view",
    "system:view",
    "settings:view",
    "users:view",
    "users:create",
    "users:update",
    "users:resetPassword",
    "users:changeRole",
    "users:disable",
    "auth:changeOwnPassword",
  ],
  SCHOOL_ADMIN: [
    "dashboard:view",
    "cameraMonitoring:view",
    "alerts:view",
    "alerts:manage",
    "cameras:view",
    "cameras:create",
    "cameras:update",
    "schools:view",
    "schools:update",
    "revenueShare:view",
    "classrooms:view",
    "classrooms:create",
    "classrooms:update",
    "children:view",
    "children:create",
    "children:update",
    "parents:view",
    "parents:create",
    "parents:linkChildren",
    "billing:view",
    "billing:manage",
    "auditLogs:view",
    "auth:changeOwnPassword",
  ],
  TECHNICIAN: [
    "dashboard:view",
    "cameraMonitoring:view",
    "alerts:view",
    "alerts:manage",
    "cameras:view",
    "system:view",
    "auth:changeOwnPassword",
  ],
};

const PERMISSION_SET: Record<DashboardRole, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set(ROLE_PERMISSIONS.SUPER_ADMIN),
  SCHOOL_ADMIN: new Set(ROLE_PERMISSIONS.SCHOOL_ADMIN),
  TECHNICIAN: new Set(ROLE_PERMISSIONS.TECHNICIAN),
};

export function isDashboardRole(role: string | undefined | null): role is DashboardRole {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" || role === "TECHNICIAN";
}

export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
): boolean {
  if (!isDashboardRole(role)) return false;
  return PERMISSION_SET[role].has(permission);
}

export function hasAnyPermission(
  role: string | undefined | null,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: string | undefined | null,
  permissions: Permission[],
): boolean {
  return permissions.length > 0 && permissions.every((p) => hasPermission(role, p));
}

/** Re-export for hooks that need the auth user role type. */
export type { UserRole };

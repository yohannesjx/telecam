import type { Permission } from "@/lib/auth/permissions";

export const ROUTE_PERMISSIONS: Array<{
  pattern: RegExp;
  permission: Permission;
}> = [
  { pattern: /^\/dashboard/, permission: "dashboard:view" },
  { pattern: /^\/camera-monitoring/, permission: "cameraMonitoring:view" },
  { pattern: /^\/monitoring/, permission: "cameraMonitoring:view" },
  { pattern: /^\/alerts/, permission: "alerts:view" },
  { pattern: /^\/cameras/, permission: "cameras:view" },
  { pattern: /^\/schools/, permission: "schools:view" },
  { pattern: /^\/parents/, permission: "parents:view" },
  { pattern: /^\/children/, permission: "children:view" },
  { pattern: /^\/billing/, permission: "billing:view" },
  { pattern: /^\/audit-logs/, permission: "auditLogs:view" },
  { pattern: /^\/system/, permission: "system:view" },
  { pattern: /^\/settings/, permission: "settings:view" },
];

const SPECIAL_ROUTE_PERMISSIONS: Array<{
  pattern: RegExp;
  permission: Permission;
}> = [
  { pattern: /^\/schools\/new\/?$/, permission: "schools:create" },
  { pattern: /^\/schools\/[^/]+\/edit\/?$/, permission: "schools:update" },
  { pattern: /^\/parents\/new\/?$/, permission: "parents:create" },
];

export function getRoutePermission(pathname: string): Permission | null {
  const path = pathname.split("?")[0] ?? pathname;

  for (const route of SPECIAL_ROUTE_PERMISSIONS) {
    if (route.pattern.test(path)) return route.permission;
  }

  for (const route of ROUTE_PERMISSIONS) {
    if (route.pattern.test(path)) return route.permission;
  }

  return null;
}

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  Camera,
  CreditCard,
  FileText,
  LayoutDashboard,
  Server,
  Settings,
  Users,
  GraduationCap,
} from "lucide-react";

import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  permission: Permission;
};

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true, permission: "dashboard:view" },
  { title: "Camera Monitoring", href: "/camera-monitoring", icon: Activity, enabled: true, permission: "cameraMonitoring:view" },
  { title: "Alerts", href: "/alerts", icon: Bell, enabled: true, permission: "alerts:view" },
  { title: "Cameras", href: "/cameras", icon: Camera, enabled: true, permission: "cameras:view" },
  { title: "Schools", href: "/schools", icon: Building2, enabled: true, permission: "schools:view" },
  { title: "Parents", href: "/parents", icon: Users, enabled: true, permission: "parents:view" },
  { title: "Children", href: "/children", icon: GraduationCap, enabled: false, permission: "children:view" },
  { title: "Billing", href: "/billing/subscriptions", icon: CreditCard, enabled: true, permission: "billing:view" },
  { title: "Audit Logs", href: "/audit-logs", icon: FileText, enabled: true, permission: "auditLogs:view" },
  { title: "System", href: "/system", icon: Server, enabled: true, permission: "system:view" },
  { title: "Settings", href: "/settings", icon: Settings, enabled: false, permission: "settings:view" },
];

export const publicRoutes = {
  login: "/login",
  dashboard: "/dashboard",
} as const;

/** Routes that require an authenticated admin session (Phase 2+). */
export const protectedRoutePrefixes = [
  "/dashboard",
  "/camera-monitoring",
  "/monitoring",
  "/alerts",
  "/cameras",
  "/schools",
  "/parents",
  "/children",
  "/billing",
  "/audit-logs",
  "/system",
  "/settings",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

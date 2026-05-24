"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState } from "react";

import { mainNavItems } from "@/lib/routes";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  navActiveIndicator,
  navItemClass,
  sidebarFooterArea,
  sidebarLogoArea,
  sidebarNavArea,
  sidebarShellClass,
} from "@/lib/ui/nav-styles";

function formatRole(role: string): string {
  return role.replace(/_/g, " ");
}

function userInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.slice(0, 2).toUpperCase();
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar();
  const [loggingOut, setLoggingOut] = useState(false);

  const iconOnly = collapsed && !mobileOpen;

  const visibleNavItems = mainNavItems.filter(
    (item) => item.enabled && hasPermission(user?.role, item.permission),
  );

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside
      className={cn(
        sidebarShellClass(iconOnly),
        "fixed inset-y-0 left-0 z-40 md:sticky md:top-0 md:h-screen",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div
        className={cn(
          sidebarLogoArea,
          iconOnly && "justify-center px-0",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-200">
          <Camera className="h-5 w-5" />
        </div>
        {!iconOnly ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{APP_NAME}</p>
            <p className="truncate text-xs text-slate-500">Admin Console</p>
          </div>
        ) : null}
      </div>

      <nav className={sidebarNavArea}>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href === "/camera-monitoring" &&
              pathname.startsWith("/cameras/") &&
              pathname.includes("/health")) ||
            (item.href === "/cameras" &&
              pathname.startsWith("/cameras") &&
              !pathname.includes("/health")) ||
            (item.href.startsWith("/billing") && pathname.startsWith("/billing")) ||
            (item.href === "/audit-logs" && pathname.startsWith("/audit-logs")) ||
            (item.href === "/system" && pathname.startsWith("/system")) ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.title}
              href={item.href}
              title={iconOnly ? item.title : undefined}
              onClick={closeMobile}
              className={navItemClass(active, iconOnly)}
            >
              {active && !iconOnly ? (
                <span aria-hidden className={navActiveIndicator} />
              ) : null}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500",
                )}
              />
              {!iconOnly ? <span className="truncate">{item.title}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-slate-200/80 p-2 md:block">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className={cn(
            "w-full text-slate-500 hover:bg-slate-100 hover:text-slate-700",
            iconOnly ? "justify-center px-0" : "justify-start",
          )}
          aria-label={iconOnly ? "Expand sidebar" : "Collapse sidebar"}
        >
          {iconOnly ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Collapse
            </>
          )}
        </Button>
      </div>

      {user ? (
        <div className={cn(sidebarFooterArea, iconOnly && "px-2")}>
          <div
            className={cn(
              "flex items-center gap-3",
              iconOnly && "justify-center",
            )}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700"
              title={iconOnly ? user.email : undefined}
            >
              {userInitials(user.email)}
            </div>
            {!iconOnly ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user.email}</p>
                <StatusBadge
                  label={formatRole(user.role)}
                  tone="info"
                  className="mt-1 px-2 py-0 text-[10px]"
                />
              </div>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "mt-3 border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              iconOnly ? "w-full justify-center px-0" : "w-full justify-start",
            )}
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            title={iconOnly ? "Sign out" : undefined}
          >
            <LogOut className={cn("h-4 w-4", !iconOnly && "mr-2")} />
            {!iconOnly ? (loggingOut ? "Signing out…" : "Sign out") : null}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

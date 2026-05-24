"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  canViewSystemRetention,
  canViewSystemWorkers,
} from "@/lib/admin/use-system-queries";
import { useAuth } from "@/lib/auth/auth-context";

const TABS = [
  { href: "/system", label: "Overview", exact: true },
  { href: "/system/workers", label: "Workers", requiresWorkers: true },
  { href: "/system/storage", label: "Storage" },
  { href: "/system/scheduler", label: "Scheduler" },
  { href: "/system/retention", label: "Retention", requiresRetention: true },
] as const;

export function SystemNavTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  const showWorkers = canViewSystemWorkers(user?.role);
  const showRetention = canViewSystemRetention(user?.role);

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-4">
      {TABS.filter((tab) => {
        if ("requiresWorkers" in tab && tab.requiresWorkers && !showWorkers) return false;
        if ("requiresRetention" in tab && tab.requiresRetention && !showRetention) return false;
        return true;
      }).map((tab) => {
        const active =
          "exact" in tab && tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { Bell, Menu, PanelLeft, PanelLeftClose, Search } from "lucide-react";

import { UserMenu } from "@/components/auth/UserMenu";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TopbarProps = {
  title?: string;
  subtitle?: string;
};

export function Topbar({
  title = "Dashboard",
  subtitle = "School camera platform overview",
}: TopbarProps) {
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebar();

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4",
        "border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl sm:px-6 lg:px-8",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-slate-200 bg-white text-slate-600 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden h-9 w-9 shrink-0 border-slate-200 bg-white text-slate-600 md:inline-flex"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="truncate text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="relative hidden w-56 lg:block xl:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search (⌘K soon)"
            className="h-9 border-slate-200 bg-slate-50/80 pl-9 text-sm placeholder:text-slate-400"
            disabled
            aria-label="Search"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          disabled
          aria-label="Notifications"
          className="relative h-9 w-9 border-slate-200 bg-white text-slate-500"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500 ring-2 ring-white" />
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

import { AuthDevInfo } from "@/components/auth/AuthDevInfo";
import { useAuth } from "@/lib/auth/auth-context";
import { normalizeDashboardRole } from "@/lib/auth/permissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatRole(role: string): string {
  return role.replace(/_/g, " ");
}

function userInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5",
          "text-left transition-colors hover:bg-slate-50",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {userInitials(user.email)}
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="max-w-[140px] truncate text-sm font-medium text-slate-900">
            {user.email}
          </p>
          <StatusBadge
            label={formatRole(normalizeDashboardRole(user.role) ?? user.role)}
            tone="info"
            className="mt-0.5 px-1.5 py-0 text-[10px]"
          />
        </div>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/60"
          >
            <div className="border-b border-slate-100 px-3 py-2.5 sm:hidden">
              <p className="truncate text-sm font-medium text-slate-900">{user.email}</p>
              <StatusBadge
                label={formatRole(user.role)}
                tone="info"
                className="mt-1 px-1.5 py-0 text-[10px]"
              />
            </div>
            <AuthDevInfo />
            <Button
              variant="ghost"
              size="sm"
              role="menuitem"
              className="w-full justify-start text-slate-600 hover:bg-slate-50"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

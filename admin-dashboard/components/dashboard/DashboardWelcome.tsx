"use client";

import { useAuth } from "@/lib/auth/auth-context";

export function DashboardWelcome() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">Welcome back</p>
      <p className="text-lg font-semibold">{user.email}</p>
      <p className="text-sm text-muted-foreground">
        Role: <span className="font-medium text-foreground">{user.role}</span>
      </p>
    </div>
  );
}

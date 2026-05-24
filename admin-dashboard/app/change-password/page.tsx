"use client";

import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SectionCard } from "@/components/ui/section-card";
import { useAuth } from "@/lib/auth/auth-context";

export default function ChangePasswordRoute() {
  const { user } = useAuth();
  const forced = user?.force_password_change === true;

  return (
    <DashboardShell
      title="Change password"
      subtitle={forced ? "Required before you can continue" : "Update your account password"}
    >
      <SectionCard
        title="Account password"
        description="Choose a strong password with at least 8 characters."
        animate={false}
      >
        <ChangePasswordForm forced={forced} />
      </SectionCard>
    </DashboardShell>
  );
}

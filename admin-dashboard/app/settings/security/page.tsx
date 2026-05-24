import Link from "next/link";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { SectionCard } from "@/components/ui/section-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SecuritySettingsRoute() {
  return (
    <DashboardShell title="Security" subtitle="Manage your account security settings">
      <SectionCard title="Password" description="Change your dashboard login password.">
        <Link href="/change-password" className={cn(buttonVariants({ variant: "outline" }))}>
          Change password
        </Link>
      </SectionCard>
    </DashboardShell>
  );
}

import { Suspense } from "react";

import { SystemOverviewPage } from "@/components/system/SystemOverviewPage";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/lib/auth/guards";

export default function SystemRoutePage() {
  return (
    <RequireAuth>
      <DashboardShell
        title="System Health"
        subtitle="Monitor backend services, workers, storage, and scheduled jobs"
      >
        <Suspense fallback={<SystemSkeleton />}>
          <SystemOverviewPage />
        </Suspense>
      </DashboardShell>
    </RequireAuth>
  );
}

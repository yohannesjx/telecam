import { Suspense } from "react";

import { SchedulerPage } from "@/components/system/scheduler/SchedulerPage";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/lib/auth/guards";

export default function SystemSchedulerRoutePage() {
  return (
    <RequireAuth>
      <DashboardShell title="Scheduler" subtitle="School hours, recording schedule, and camera desired states">
        <Suspense fallback={<SystemSkeleton />}>
          <SchedulerPage />
        </Suspense>
      </DashboardShell>
    </RequireAuth>
  );
}

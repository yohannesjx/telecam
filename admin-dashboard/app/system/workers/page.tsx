import { Suspense } from "react";

import { WorkersPage } from "@/components/system/workers/WorkersPage";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/lib/auth/guards";

export default function SystemWorkersRoutePage() {
  return (
    <RequireAuth>
      <DashboardShell title="Workers" subtitle="Stream, health, alert, scheduler, and retention worker heartbeats">
        <Suspense fallback={<SystemSkeleton />}>
          <WorkersPage />
        </Suspense>
      </DashboardShell>
    </RequireAuth>
  );
}

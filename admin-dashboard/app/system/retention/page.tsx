import { Suspense } from "react";

import { RetentionPage } from "@/components/system/retention/RetentionPage";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/lib/auth/guards";

export default function SystemRetentionRoutePage() {
  return (
    <RequireAuth>
      <DashboardShell title="Retention" subtitle="Segment retention policy and cleanup worker status">
        <Suspense fallback={<SystemSkeleton />}>
          <RetentionPage />
        </Suspense>
      </DashboardShell>
    </RequireAuth>
  );
}

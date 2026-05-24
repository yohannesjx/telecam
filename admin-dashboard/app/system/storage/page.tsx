import { Suspense } from "react";

import { StoragePage } from "@/components/system/storage/StoragePage";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/lib/auth/guards";

export default function SystemStorageRoutePage() {
  return (
    <RequireAuth>
      <DashboardShell title="Storage" subtitle="R2 storage usage and estimated monthly cost">
        <Suspense fallback={<SystemSkeleton />}>
          <StoragePage />
        </Suspense>
      </DashboardShell>
    </RequireAuth>
  );
}

import { Suspense } from "react";

import { AuditLogsPage } from "@/components/audit-logs/AuditLogsPage";
import { AuditLogsSkeleton } from "@/components/audit-logs/AuditLogsSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/lib/auth/guards";

export default function AuditLogsRoutePage() {
  return (
    <RequireAuth>
      <DashboardShell
        title="Audit Logs"
        subtitle="Review security, playback, billing, and admin activity."
      >
        <Suspense fallback={<AuditLogsSkeleton />}>
          <AuditLogsPage />
        </Suspense>
      </DashboardShell>
    </RequireAuth>
  );
}

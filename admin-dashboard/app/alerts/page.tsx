import { Suspense } from "react";

import { AlertsPage } from "@/components/alerts/AlertsPage";
import { AlertsSkeleton } from "@/components/alerts/AlertsSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function AlertsRoutePage() {
  return (
    <DashboardShell
      title="Alerts Center"
      subtitle="Manage camera, worker, upload, and school connectivity incidents"
    >
      <Suspense fallback={<AlertsSkeleton />}>
        <AlertsPage />
      </Suspense>
    </DashboardShell>
  );
}

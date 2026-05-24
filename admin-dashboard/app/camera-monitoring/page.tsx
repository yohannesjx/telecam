import { Suspense } from "react";

import { CameraMonitoringPage } from "@/components/camera-monitoring/CameraMonitoringPage";
import { CameraMonitoringSkeleton } from "@/components/camera-monitoring/CameraMonitoringSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function CameraMonitoringRoutePage() {
  return (
    <DashboardShell
      title="Camera Monitoring"
      subtitle="Live operational status of school cameras"
    >
      <Suspense fallback={<CameraMonitoringSkeleton />}>
        <CameraMonitoringPage />
      </Suspense>
    </DashboardShell>
  );
}

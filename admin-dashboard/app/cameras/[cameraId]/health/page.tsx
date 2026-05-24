import { Suspense } from "react";

import { CameraHealthPage } from "@/components/camera-monitoring/CameraHealthPage";
import { CameraMonitoringSkeleton } from "@/components/camera-monitoring/CameraMonitoringSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";

type PageProps = {
  params: Promise<{ cameraId: string }>;
};

export default async function CameraHealthRoutePage({ params }: PageProps) {
  const { cameraId } = await params;

  return (
    <DashboardShell title="Camera Health" subtitle="Detailed health and stream status">
      <Suspense fallback={<CameraMonitoringSkeleton />}>
        <CameraHealthPage cameraId={cameraId} />
      </Suspense>
    </DashboardShell>
  );
}

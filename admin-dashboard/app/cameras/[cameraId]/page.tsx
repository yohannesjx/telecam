import { Suspense } from "react";

import { CameraDetailPage } from "@/components/cameras/CameraDetailPage";
import { CamerasSkeleton } from "@/components/cameras/CamerasSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";

type PageProps = {
  params: Promise<{ cameraId: string }>;
};

export default async function CameraDetailRoutePage({ params }: PageProps) {
  const { cameraId } = await params;

  return (
    <DashboardShell title="Camera" subtitle="Configuration and status">
      <Suspense fallback={<CamerasSkeleton />}>
        <CameraDetailPage cameraId={cameraId} />
      </Suspense>
    </DashboardShell>
  );
}

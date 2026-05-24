"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { CameraHealthCards } from "@/components/camera-monitoring/CameraHealthCards";
import { CameraHealthEvents } from "@/components/camera-monitoring/CameraHealthEvents";
import { CameraMonitoringError } from "@/components/camera-monitoring/CameraMonitoringError";
import { CameraMonitoringSkeleton } from "@/components/camera-monitoring/CameraMonitoringSkeleton";
import { CameraStatusBadge } from "@/components/camera-monitoring/CameraStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  useCameraHealthQuery,
  useSchedulerStatusQuery,
} from "@/lib/admin/use-camera-monitoring-queries";
import { formatTimeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

type CameraHealthPageProps = {
  cameraId: string;
};

export function CameraHealthPage({ cameraId }: CameraHealthPageProps) {
  const searchParams = useSearchParams();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const healthQuery = useCameraHealthQuery(cameraId);
  const schedulerQuery = useSchedulerStatusQuery(Boolean(healthQuery.data));

  useEffect(() => {
    if (healthQuery.dataUpdatedAt) {
      setLastUpdated(new Date(healthQuery.dataUpdatedAt));
    }
  }, [healthQuery.dataUpdatedAt]);

  const schoolName = searchParams.get("schoolName") ?? healthQuery.data?.schoolName ?? "N/A";
  const classroomName =
    searchParams.get("classroomName") ?? healthQuery.data?.classroomName ?? "N/A";

  const handleRefresh = () => {
    void healthQuery.refetch();
    void schedulerQuery.refetch();
  };

  if (healthQuery.isLoading) {
    return <CameraMonitoringSkeleton />;
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <CameraMonitoringError
        message="Could not load camera health."
        onRetry={handleRefresh}
        isRetrying={healthQuery.isFetching}
      />
    );
  }

  const health = healthQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm text-muted-foreground">
          <Link href="/camera-monitoring" className="hover:text-foreground">
            Camera Monitoring
          </Link>
          <span className="mx-2">→</span>
          <span className="text-foreground">Camera Health</span>
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={healthQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${healthQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Link
        href="/camera-monitoring"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Camera Monitoring
      </Link>

      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {health.name ?? "Camera"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {schoolName} · {classroomName}
            </p>
            {health.defaultQuality ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Default quality: {health.defaultQuality}
              </p>
            ) : null}
          </div>
          <CameraStatusBadge status={health.status} />
        </div>
      </div>

      <CameraHealthCards health={health} />

      <CameraHealthEvents
        events={health.events}
        alerts={health.alerts}
        scheduler={schedulerQuery.data}
        playlistExists={health.playlistExists}
      />
    </div>
  );
}

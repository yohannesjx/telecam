"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CameraStatusBadge } from "@/components/camera-monitoring/CameraStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCameraHealthQuery } from "@/lib/admin/use-camera-monitoring-queries";
import { cameraOperationalStatusLabel, formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type CameraHealthSummaryCardProps = {
  cameraId: string;
  schoolName?: string | null;
  classroomName?: string | null;
};

export function CameraHealthSummaryCard({
  cameraId,
  schoolName,
  classroomName,
}: CameraHealthSummaryCardProps) {
  const healthQuery = useCameraHealthQuery(cameraId);

  if (healthQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Health summary</CardTitle>
          <CardDescription>Could not load camera health.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const health = healthQuery.data;
  const params = new URLSearchParams();
  if (schoolName) params.set("schoolName", schoolName);
  if (classroomName) params.set("classroomName", classroomName);
  const query = params.toString();
  const healthHref = `/cameras/${cameraId}/health${query ? `?${query}` : ""}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Health summary</CardTitle>
          <CardDescription>Compact operational health from monitoring</CardDescription>
        </div>
        <Link href={healthHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Full health
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Current status</dt>
            <dd className="mt-1 flex items-center gap-2">
              <CameraStatusBadge status={health.status} />
              <span className="text-sm">{cameraOperationalStatusLabel(health.status)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last segment time</dt>
            <dd className="text-sm font-medium">{formatDateTime(health.lastSegmentAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Stream lag (seconds)</dt>
            <dd className="text-sm font-medium">{health.streamLagSeconds ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last health event</dt>
            <dd className="text-sm font-medium">{health.lastHealthEvent ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Open alerts</dt>
            <dd className="text-sm font-medium">{formatNumber(health.openAlertsCount)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

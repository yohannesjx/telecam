"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { NormalizedCameraStreamState } from "@/lib/admin/cameras-types";
import { useCameraStreamStateQuery } from "@/lib/admin/use-cameras-queries";
import { formatDateTime } from "@/lib/format";

type CameraStreamStateCardProps = {
  cameraId: string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function formatStreamState(state: NormalizedCameraStreamState | undefined) {
  if (!state) return "N/A";
  const desired = state.desiredState ?? "UNKNOWN";
  const reason = state.reason;
  if (reason) return `${desired} / ${reason}`;
  return desired;
}

export function CameraStreamStateCard({ cameraId }: CameraStreamStateCardProps) {
  const streamQuery = useCameraStreamStateQuery(cameraId);

  if (streamQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (streamQuery.isError) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Stream state</CardTitle>
          <CardDescription>Could not load stream state.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const state = streamQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stream state</CardTitle>
        <CardDescription>Desired runtime state from the stream scheduler</CardDescription>
      </CardHeader>
      <CardContent>
        <dl>
          <DetailRow label="Schedule status" value={formatStreamState(state)} />
          <DetailRow label="Desired state" value={state?.desiredState ?? "N/A"} />
          <DetailRow label="Reason" value={state?.reason ?? "N/A"} />
          <DetailRow label="Updated at" value={formatDateTime(state?.updatedAt)} />
        </dl>
      </CardContent>
    </Card>
  );
}

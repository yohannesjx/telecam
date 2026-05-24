"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { CameraHealthSummaryCard } from "@/components/cameras/CameraHealthSummaryCard";
import { CameraQualityBadge } from "@/components/cameras/CameraQualityBadge";
import { CameraStatusBadge } from "@/components/cameras/CameraStatusBadge";
import { CameraStreamStateCard } from "@/components/cameras/CameraStreamStateCard";
import { CamerasError } from "@/components/cameras/CamerasError";
import { CamerasSkeleton } from "@/components/cameras/CamerasSkeleton";
import { ConfirmDisableCameraModal } from "@/components/cameras/ConfirmDisableCameraModal";
import { EditCameraForm } from "@/components/cameras/EditCameraForm";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  canManageCameras,
  useCameraDetailQuery,
  useSchoolsQuery,
  useUpdateCameraMutation,
} from "@/lib/admin/use-cameras-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatNumber, formatTimeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "configuration", label: "Configuration" },
  { id: "health", label: "Health" },
  { id: "stream-state", label: "Stream state" },
  { id: "danger-zone", label: "Danger zone" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type CameraDetailPageProps = {
  cameraId: string;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function CameraDetailPage({ cameraId }: CameraDetailPageProps) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canManage = canManageCameras(user?.role);

  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "overview",
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);

  const cameraQuery = useCameraDetailQuery(cameraId);
  const schoolsQuery = useSchoolsQuery();
  const updateMutation = useUpdateCameraMutation();

  useEffect(() => {
    if (cameraQuery.dataUpdatedAt) {
      setLastUpdated(new Date(cameraQuery.dataUpdatedAt));
    }
  }, [cameraQuery.dataUpdatedAt]);

  const handleRefresh = () => {
    void cameraQuery.refetch();
  };

  const schoolName =
    cameraQuery.data?.schoolName ??
    schoolsQuery.data?.find((s) => s.id === cameraQuery.data?.schoolId)?.name ??
    "N/A";

  const healthHref = (() => {
    const params = new URLSearchParams();
    if (schoolName !== "N/A") params.set("schoolName", schoolName);
    if (cameraQuery.data?.classroomName) params.set("classroomName", cameraQuery.data.classroomName);
    const query = params.toString();
    return `/cameras/${cameraId}/health${query ? `?${query}` : ""}`;
  })();

  const handleEnable = async () => {
    try {
      await updateMutation.mutateAsync({
        cameraId,
        input: { status: "ACTIVE" },
      });
      toast.success("Camera enabled.");
    } catch {
      toast.error("Could not enable camera.");
    }
  };

  const handleDisable = async () => {
    try {
      await updateMutation.mutateAsync({
        cameraId,
        input: { status: "DISABLED" },
      });
      toast.success("Camera disabled.");
      setDisableOpen(false);
    } catch {
      toast.error("Could not disable camera.");
    }
  };

  if (cameraQuery.isLoading) {
    return <CamerasSkeleton />;
  }

  if (cameraQuery.isError || !cameraQuery.data) {
    return <CamerasError message="Could not load camera." onRetry={handleRefresh} isRetrying={cameraQuery.isFetching} />;
  }

  const camera = cameraQuery.data;
  const isDisabled = camera.status === "DISABLED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Link
            href="/cameras"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to cameras
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{camera.name}</h1>
            <p className="text-sm text-muted-foreground">Camera configuration and operational status</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={cameraQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${cameraQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href={healthHref} className={cn(buttonVariants({ variant: "outline" }))}>
            View Health
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={tab === item.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Read-only camera summary</CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Camera name" value={camera.name} />
              <DetailRow label="School" value={schoolName} />
              <DetailRow label="Classroom" value={camera.classroomName ?? "N/A"} />
              <DetailRow
                label="Status"
                value={<CameraStatusBadge status={camera.status} />}
              />
              <DetailRow
                label="Default quality"
                value={<CameraQualityBadge quality={camera.defaultQuality} />}
              />
              <DetailRow label="Desired state" value={camera.desiredState ?? "N/A"} />
              <DetailRow label="Schedule reason" value={camera.scheduleReason ?? "N/A"} />
              <DetailRow label="Last segment time" value={formatDateTime(camera.lastSegmentAt)} />
              <DetailRow label="Open alerts" value={formatNumber(camera.openAlerts)} />
              <DetailRow label="Created at" value={formatDateTime(camera.createdAt)} />
              <DetailRow label="Updated at" value={formatDateTime(camera.updatedAt)} />
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {tab === "configuration" ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Update camera settings. RTSP URL is write-only and never displayed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditCameraForm camera={camera} canManage={canManage} onSaved={handleRefresh} />
          </CardContent>
        </Card>
      ) : null}

      {tab === "health" ? (
        <CameraHealthSummaryCard
          cameraId={cameraId}
          schoolName={schoolName}
          classroomName={camera.classroomName}
        />
      ) : null}

      {tab === "stream-state" ? <CameraStreamStateCard cameraId={cameraId} /> : null}

      {tab === "danger-zone" ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>Enable or disable this camera</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManage ? (
              <p className="text-sm text-muted-foreground">You do not have permission to change camera status.</p>
            ) : isDisabled ? (
              <Button onClick={() => void handleEnable()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Enabling..." : "Enable camera"}
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setDisableOpen(true)}>
                Disable camera
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDisableCameraModal
        camera={camera}
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        isPending={updateMutation.isPending}
        onConfirm={() => void handleDisable()}
      />
    </div>
  );
}

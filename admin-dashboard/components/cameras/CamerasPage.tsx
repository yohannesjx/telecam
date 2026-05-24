"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { CameraTable } from "@/components/cameras/CameraTable";
import { ListEmptyState } from "@/components/common/ListEmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { CamerasError } from "@/components/cameras/CamerasError";
import { CamerasFilters, filterCameras } from "@/components/cameras/CamerasFilters";
import { CamerasSkeleton } from "@/components/cameras/CamerasSkeleton";
import { ConfirmDisableCameraModal } from "@/components/cameras/ConfirmDisableCameraModal";
import { CreateCameraDialog } from "@/components/cameras/CreateCameraDialog";
import { Button } from "@/components/ui/button";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { enrichCamerasWithNames } from "@/lib/admin/cameras-normalizer";
import type { NormalizedCamera } from "@/lib/admin/cameras-types";
import {
  canManageCameras,
  useSchoolCamerasQuery,
  useSchoolClassroomsQuery,
  useSchoolsQuery,
  useUpdateCameraMutation,
} from "@/lib/admin/use-cameras-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

type CamerasPageProps = {
  fixedSchoolId?: string;
  showSchoolFilter?: boolean;
  title?: string;
  subtitle?: string;
  backLink?: React.ReactNode;
};

export function CamerasPage({
  fixedSchoolId,
  showSchoolFilter = true,
  title = "Cameras",
  subtitle = "Manage camera configuration and stream settings",
  backLink,
}: CamerasPageProps) {
  const { user } = useAuth();
  const canManage = canManageCameras(user?.role);

  const schoolsQuery = useSchoolsQuery();
  const [schoolId, setSchoolId] = useState(fixedSchoolId ?? "");
  const [status, setStatus] = useState("all");
  const [quality, setQuality] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [disableTarget, setDisableTarget] = useState<NormalizedCamera | null>(null);
  const [actingCameraId, setActingCameraId] = useState<string | null>(null);

  const effectiveSchoolId = fixedSchoolId ?? schoolId;
  const camerasQuery = useSchoolCamerasQuery(effectiveSchoolId || null);
  const classroomsQuery = useSchoolClassroomsQuery(effectiveSchoolId || null);
  const updateMutation = useUpdateCameraMutation();

  useEffect(() => {
    if (fixedSchoolId) {
      setSchoolId(fixedSchoolId);
      return;
    }
    if (!schoolId && schoolsQuery.data?.length) {
      setSchoolId(schoolsQuery.data[0].id);
    }
  }, [fixedSchoolId, schoolId, schoolsQuery.data]);

  useEffect(() => {
    if (camerasQuery.dataUpdatedAt) {
      setLastUpdated(new Date(camerasQuery.dataUpdatedAt));
    }
  }, [camerasQuery.dataUpdatedAt]);

  const enrichedCameras = useMemo(() => {
    const cameras = camerasQuery.data ?? [];
    return enrichCamerasWithNames(
      cameras,
      schoolsQuery.data ?? [],
      classroomsQuery.data ?? [],
      effectiveSchoolId,
    );
  }, [camerasQuery.data, schoolsQuery.data, classroomsQuery.data, effectiveSchoolId]);

  const filteredCameras = useMemo(
    () => filterCameras(enrichedCameras, { status, quality, search: debouncedSearch }),
    [enrichedCameras, status, quality, debouncedSearch],
  );

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) || status !== "all" || quality !== "all";

  const pagination = useClientPagination(filteredCameras, {
    resetDeps: [debouncedSearch, status, quality, effectiveSchoolId],
  });

  const handleRefresh = () => {
    void schoolsQuery.refetch();
    void camerasQuery.refetch();
    void classroomsQuery.refetch();
  };

  const setCameraStatus = async (camera: NormalizedCamera, nextStatus: "ACTIVE" | "DISABLED") => {
    setActingCameraId(camera.id);
    try {
      await updateMutation.mutateAsync({
        cameraId: camera.id,
        input: { status: nextStatus },
      });
      toast.success(nextStatus === "ACTIVE" ? "Camera enabled." : "Camera disabled.");
      setDisableTarget(null);
    } catch {
      toast.error("Could not update camera status.");
    } finally {
      setActingCameraId(null);
    }
  };

  const schools = schoolsQuery.data ?? [];
  const selectedSchoolName = schools.find((s) => s.id === effectiveSchoolId)?.name;

  return (
    <div className="space-y-6">
      {backLink}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          {selectedSchoolName && fixedSchoolId ? (
            <p className="mt-1 text-sm text-muted-foreground">School: {selectedSchoolName}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={camerasQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${camerasQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage ? (
            <Button onClick={() => setCreateOpen(true)} disabled={!effectiveSchoolId}>
              <Plus className="mr-2 h-4 w-4" />
              Create Camera
            </Button>
          ) : null}
        </div>
      </div>

      {showSchoolFilter ? (
        <CamerasFilters
          schools={schools}
          schoolId={effectiveSchoolId}
          status={status}
          quality={quality}
          search={search}
          lockSchool={Boolean(fixedSchoolId)}
          onSchoolIdChange={setSchoolId}
          onStatusChange={setStatus}
          onQualityChange={setQuality}
          onSearchChange={setSearch}
        />
      ) : (
        <CamerasFilters
          schools={schools}
          schoolId={effectiveSchoolId}
          status={status}
          quality={quality}
          search={search}
          lockSchool
          onSchoolIdChange={() => undefined}
          onStatusChange={setStatus}
          onQualityChange={setQuality}
          onSearchChange={setSearch}
        />
      )}

      {!effectiveSchoolId ? (
        <div className="surface-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Select a school to load cameras.</p>
        </div>
      ) : camerasQuery.isLoading ? (
        <CamerasSkeleton />
      ) : camerasQuery.isError ? (
        <CamerasError onRetry={handleRefresh} isRetrying={camerasQuery.isFetching} />
      ) : filteredCameras.length === 0 ? (
        <ListEmptyState filtered={hasActiveFilters} title="No cameras found" />
      ) : (
        <>
          <ListResultsMeta
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            filtered={hasActiveFilters}
          />
          <CameraTable
            cameras={pagination.paginatedItems}
            canManage={canManage}
            actingCameraId={actingCameraId}
            onEnable={(camera) => void setCameraStatus(camera, "ACTIVE")}
            onDisable={setDisableTarget}
          />
          <ListPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}

      <CreateCameraDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        schools={schools}
        defaultSchoolId={effectiveSchoolId}
        lockSchool={Boolean(fixedSchoolId)}
      />

      <ConfirmDisableCameraModal
        camera={disableTarget}
        open={Boolean(disableTarget)}
        onClose={() => setDisableTarget(null)}
        isPending={updateMutation.isPending}
        onConfirm={() => {
          if (disableTarget) void setCameraStatus(disableTarget, "DISABLED");
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { CameraMonitoringError } from "@/components/camera-monitoring/CameraMonitoringError";
import { CameraMonitoringSkeleton } from "@/components/camera-monitoring/CameraMonitoringSkeleton";
import { CameraStatusFilters } from "@/components/camera-monitoring/CameraStatusFilters";
import { CameraStatusSummaryCards } from "@/components/camera-monitoring/CameraStatusSummaryCards";
import { CameraStatusTable } from "@/components/camera-monitoring/CameraStatusTable";
import { Button } from "@/components/ui/button";
import { computeCameraStatusSummary } from "@/lib/admin/camera-monitoring-normalizer";
import type {
  CameraStatusFilter,
  NormalizedCameraStatus,
} from "@/lib/admin/camera-monitoring-types";
import {
  useSchoolCameraStatusQuery,
  useSchoolsQuery,
} from "@/lib/admin/use-camera-monitoring-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

function filterCameras(
  cameras: NormalizedCameraStatus[],
  search: string,
  statusFilter: CameraStatusFilter,
) {
  const query = search.trim().toLowerCase();
  return cameras.filter((camera) => {
    if (statusFilter !== "all" && camera.status !== statusFilter) return false;
    if (!query) return true;
    const haystack = [camera.name, camera.classroomName, camera.schoolName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function CameraMonitoringPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CameraStatusFilter>("all");
  const [manualSchoolId, setManualSchoolId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const schoolsQuery = useSchoolsQuery();
  const schools = schoolsQuery.data ?? [];
  const showManualSchoolEntry =
    user?.role === "TECHNICIAN" && schools.length === 0 && !schoolsQuery.isLoading;

  const selectedSchoolId =
    searchParams.get("schoolId") ?? (showManualSchoolEntry ? manualSchoolId : "");

  const statusQuery = useSchoolCameraStatusQuery(selectedSchoolId || null);

  useEffect(() => {
    if (statusQuery.dataUpdatedAt) {
      setLastUpdated(new Date(statusQuery.dataUpdatedAt));
    }
  }, [statusQuery.dataUpdatedAt]);

  useEffect(() => {
    if (selectedSchoolId || showManualSchoolEntry || schools.length !== 1) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("schoolId", schools[0].id);
    router.replace(`/camera-monitoring?${params.toString()}`);
  }, [schools, selectedSchoolId, showManualSchoolEntry, router, searchParams]);

  const filteredCameras = useMemo(
    () => filterCameras(statusQuery.data?.cameras ?? [], search, statusFilter),
    [statusQuery.data?.cameras, search, statusFilter],
  );

  const summary = useMemo(
    () => computeCameraStatusSummary(statusQuery.data?.cameras ?? []),
    [statusQuery.data?.cameras],
  );

  function handleSchoolChange(schoolId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (schoolId) params.set("schoolId", schoolId);
    else params.delete("schoolId");
    router.replace(`/camera-monitoring?${params.toString()}`);
  }

  const handleRefresh = () => {
    void statusQuery.refetch();
    void schoolsQuery.refetch();
  };

  if (schoolsQuery.isLoading && !selectedSchoolId) {
    return <CameraMonitoringSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Last updated:{" "}
          {lastUpdated ? formatTimeOnly(lastUpdated) : statusQuery.isFetching ? "Refreshing…" : "—"}
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={statusQuery.isFetching || schoolsQuery.isFetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${statusQuery.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <CameraStatusFilters
        schools={schools}
        schoolId={selectedSchoolId}
        onSchoolChange={handleSchoolChange}
        manualSchoolId={manualSchoolId}
        onManualSchoolIdChange={setManualSchoolId}
        showManualSchoolEntry={showManualSchoolEntry}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {!selectedSchoolId ? (
        <div className="surface-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Select a school to view camera status.</p>
        </div>
      ) : statusQuery.isLoading ? (
        <CameraMonitoringSkeleton />
      ) : statusQuery.isError ? (
        <CameraMonitoringError onRetry={handleRefresh} isRetrying={statusQuery.isFetching} />
      ) : (
        <>
          <CameraStatusSummaryCards summary={summary} />
          <CameraStatusTable
            cameras={filteredCameras}
            schoolName={statusQuery.data?.schoolName}
          />
        </>
      )}
    </div>
  );
}

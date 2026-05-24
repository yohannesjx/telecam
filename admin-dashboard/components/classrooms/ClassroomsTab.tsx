"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { ClassroomsError } from "@/components/classrooms/ClassroomsError";
import { ClassroomsSkeleton } from "@/components/classrooms/ClassroomsSkeleton";
import { ClassroomsTable } from "@/components/classrooms/ClassroomsTable";
import { CreateClassroomDialog } from "@/components/classrooms/CreateClassroomDialog";
import { EditClassroomDialog } from "@/components/classrooms/EditClassroomDialog";
import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";
import { enrichClassroomsWithCounts, filterClassrooms } from "@/lib/admin/classrooms-normalizer";
import { useSchoolCamerasQuery } from "@/lib/admin/use-cameras-queries";
import { useSchoolChildrenQuery } from "@/lib/admin/use-children-queries";
import {
  canManageSchoolStructure,
  useSchoolClassroomsQuery,
} from "@/lib/admin/use-classrooms-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

type ClassroomsTabProps = {
  schoolId: string;
  onViewChildren?: (classroomId: string) => void;
  onViewCameras?: () => void;
};

export function ClassroomsTab({
  schoolId,
  onViewChildren,
  onViewCameras,
}: ClassroomsTabProps) {
  const { user } = useAuth();
  const canManage = canManageSchoolStructure(user?.role);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NormalizedClassroom | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const classroomsQuery = useSchoolClassroomsQuery(schoolId);
  const childrenQuery = useSchoolChildrenQuery(schoolId);
  const camerasQuery = useSchoolCamerasQuery(schoolId);

  const enriched = useMemo(() => {
    const children = childrenQuery.data ?? [];
    const cameras = camerasQuery.data ?? [];
    const childrenByClassroom = new Map<string, number>();
    const camerasByClassroom = new Map<string, number>();
    for (const child of children) {
      if (!child.classroomId) continue;
      childrenByClassroom.set(
        child.classroomId,
        (childrenByClassroom.get(child.classroomId) ?? 0) + 1,
      );
    }
    for (const camera of cameras) {
      if (!camera.classroomId) continue;
      camerasByClassroom.set(
        camera.classroomId,
        (camerasByClassroom.get(camera.classroomId) ?? 0) + 1,
      );
    }
    return enrichClassroomsWithCounts(
      classroomsQuery.data ?? [],
      childrenByClassroom,
      camerasByClassroom,
    );
  }, [classroomsQuery.data, childrenQuery.data, camerasQuery.data]);

  const filtered = useMemo(
    () => filterClassrooms(enriched, { search, status }),
    [enriched, search, status],
  );

  const handleRefresh = () => {
    void classroomsQuery.refetch();
    void childrenQuery.refetch();
    void camerasQuery.refetch();
    setLastUpdated(new Date());
  };

  if (classroomsQuery.isLoading) return <ClassroomsSkeleton />;
  if (classroomsQuery.isError) {
    return (
      <ClassroomsError
        onRetry={handleRefresh}
        isRetrying={classroomsQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Classrooms</h2>
          <p className="text-sm text-muted-foreground">Manage classrooms for this school</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={classroomsQuery.isFetching}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${classroomsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Classroom
            </Button>
          ) : null}
        </div>
      </div>

      <div className="surface-filter grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="classrooms-search">Search</Label>
          <Input
            id="classrooms-search"
            placeholder="Classroom name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="classrooms-status">Status</Label>
          <select
            id="classrooms-status"
            className={SELECT_CLASS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      <ClassroomsTable
        classrooms={filtered}
        canManage={canManage}
        onEdit={setEditTarget}
        onViewChildren={(room) => onViewChildren?.(room.id)}
        onViewCameras={() => onViewCameras?.()}
      />

      <CreateClassroomDialog
        open={createOpen}
        schoolId={schoolId}
        onClose={() => setCreateOpen(false)}
      />
      <EditClassroomDialog
        open={Boolean(editTarget)}
        schoolId={schoolId}
        classroom={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
}

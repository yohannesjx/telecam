"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { ChildrenFilters } from "@/components/children/ChildrenFilters";
import { ChildrenTable } from "@/components/children/ChildrenTable";
import { CreateChildDialog } from "@/components/children/CreateChildDialog";
import { EditChildDialog } from "@/components/children/EditChildDialog";
import { ChildParentsDialog } from "@/components/parents/ChildParentsDialog";
import { ClassroomsError } from "@/components/classrooms/ClassroomsError";
import { ClassroomsSkeleton } from "@/components/classrooms/ClassroomsSkeleton";
import { Button } from "@/components/ui/button";
import type { NormalizedChild } from "@/lib/admin/children-types";
import { enrichChildrenWithClassroomNames, filterChildren } from "@/lib/admin/children-normalizer";
import { useSchoolChildrenQuery } from "@/lib/admin/use-children-queries";
import {
  canManageSchoolStructure,
  useSchoolClassroomsQuery,
} from "@/lib/admin/use-classrooms-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

type ChildrenTabProps = {
  schoolId: string;
  initialClassroomId?: string;
};

export function ChildrenTab({ schoolId, initialClassroomId = "" }: ChildrenTabProps) {
  const { user } = useAuth();
  const canManage = canManageSchoolStructure(user?.role);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [classroomId, setClassroomId] = useState(initialClassroomId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NormalizedChild | null>(null);
  const [changeClassroomTarget, setChangeClassroomTarget] = useState<NormalizedChild | null>(
    null,
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [parentsTarget, setParentsTarget] = useState<NormalizedChild | null>(null);

  useEffect(() => {
    if (initialClassroomId) setClassroomId(initialClassroomId);
  }, [initialClassroomId]);

  const classroomsQuery = useSchoolClassroomsQuery(schoolId);
  const childrenQuery = useSchoolChildrenQuery(schoolId);

  const enriched = useMemo(() => {
    const classrooms = classroomsQuery.data ?? [];
    return enrichChildrenWithClassroomNames(childrenQuery.data ?? [], classrooms);
  }, [childrenQuery.data, classroomsQuery.data]);

  const filtered = useMemo(
    () => filterChildren(enriched, { search, status, classroomId }),
    [enriched, search, status, classroomId],
  );

  const handleRefresh = () => {
    void childrenQuery.refetch();
    void classroomsQuery.refetch();
    setLastUpdated(new Date());
  };

  if (childrenQuery.isLoading || classroomsQuery.isLoading) {
    return <ClassroomsSkeleton />;
  }
  if (childrenQuery.isError) {
    return (
      <ClassroomsError
        message="Could not load children."
        onRetry={handleRefresh}
        isRetrying={childrenQuery.isFetching}
      />
    );
  }

  const classrooms = classroomsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Children</h2>
          <p className="text-sm text-muted-foreground">
            Manage children and classroom assignments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={childrenQuery.isFetching}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${childrenQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canManage ? (
            <Button onClick={() => setCreateOpen(true)} disabled={classrooms.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Create Child
            </Button>
          ) : null}
        </div>
      </div>

      {classrooms.length === 0 ? (
        <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          Create at least one classroom before adding children.
        </p>
      ) : null}

      <ChildrenFilters
        classrooms={classrooms}
        search={search}
        status={status}
        classroomId={classroomId}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onClassroomIdChange={setClassroomId}
      />

      <ChildrenTable
        items={filtered}
        canManage={canManage}
        onEdit={setEditTarget}
        onChangeClassroom={setChangeClassroomTarget}
        onManageParents={setParentsTarget}
      />

      <CreateChildDialog
        open={createOpen}
        schoolId={schoolId}
        classrooms={classrooms}
        defaultClassroomId={classroomId}
        onClose={() => setCreateOpen(false)}
      />
      <EditChildDialog
        open={Boolean(editTarget)}
        schoolId={schoolId}
        child={editTarget}
        classrooms={classrooms}
        onClose={() => setEditTarget(null)}
      />
      <EditChildDialog
        open={Boolean(changeClassroomTarget)}
        schoolId={schoolId}
        child={changeClassroomTarget}
        classrooms={classrooms}
        focusClassroom
        onClose={() => setChangeClassroomTarget(null)}
      />
      <ChildParentsDialog
        open={Boolean(parentsTarget)}
        childId={parentsTarget?.id ?? null}
        onClose={() => setParentsTarget(null)}
      />
    </div>
  );
}

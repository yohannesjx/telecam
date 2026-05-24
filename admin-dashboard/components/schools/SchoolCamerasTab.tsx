"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { CameraTable } from "@/components/cameras/CameraTable";
import { CamerasError } from "@/components/cameras/CamerasError";
import { CamerasSkeleton } from "@/components/cameras/CamerasSkeleton";
import { CreateCameraDialog } from "@/components/cameras/CreateCameraDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { enrichCamerasWithNames } from "@/lib/admin/cameras-normalizer";
import { useSchoolCamerasQuery } from "@/lib/admin/use-cameras-queries";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { canManageCameras } from "@/lib/admin/use-cameras-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function SchoolCamerasTab({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const { user } = useAuth();
  const canManage = canManageCameras(user?.role);
  const [createOpen, setCreateOpen] = useState(false);

  const schoolsQuery = useSchoolsListQuery();
  const camerasQuery = useSchoolCamerasQuery(schoolId);

  const cameras = useMemo(() => {
    const list = camerasQuery.data ?? [];
    return enrichCamerasWithNames(list, schoolsQuery.data ?? [], [], schoolId).map((c) => ({
      ...c,
      schoolName: schoolName,
    }));
  }, [camerasQuery.data, schoolsQuery.data, schoolId, schoolName]);

  if (camerasQuery.isLoading) return <CamerasSkeleton />;
  if (camerasQuery.isError) {
    return (
      <CamerasError
        onRetry={() => void camerasQuery.refetch()}
        isRetrying={camerasQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <Link
          href={`/schools/${schoolId}/cameras`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Open school cameras page
        </Link>
        {canManage ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create camera
          </Button>
        ) : null}
      </div>
      <CameraTable cameras={cameras} canManage={canManage} />
      <CreateCameraDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        schools={schoolsQuery.data ?? []}
        defaultSchoolId={schoolId}
        lockSchool
      />
    </div>
  );
}

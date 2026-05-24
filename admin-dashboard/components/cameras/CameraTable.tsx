"use client";

import Link from "next/link";

import { CameraQualityBadge } from "@/components/cameras/CameraQualityBadge";
import { CameraStatusBadge } from "@/components/cameras/CameraStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
} from "@/components/ui/data-table";
import type { NormalizedCamera } from "@/lib/admin/cameras-types";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type CameraTableProps = {
  cameras: NormalizedCamera[];
  canManage?: boolean;
  onEnable?: (camera: NormalizedCamera) => void;
  onDisable?: (camera: NormalizedCamera) => void;
  actingCameraId?: string | null;
  emptyMessage?: string;
};

function healthLink(camera: NormalizedCamera) {
  const params = new URLSearchParams();
  if (camera.schoolName) params.set("schoolName", camera.schoolName);
  if (camera.classroomName) params.set("classroomName", camera.classroomName);
  const query = params.toString();
  return `/cameras/${camera.id}/health${query ? `?${query}` : ""}`;
}

export function CameraTable({
  cameras,
  canManage = false,
  onEnable,
  onDisable,
  actingCameraId,
  emptyMessage = "No cameras found.",
}: CameraTableProps) {
  if (cameras.length === 0) {
    return <DataTableEmpty title={emptyMessage} description="Create your first camera." />;
  }

  return (
    <DataTableRoot>
      <DataTable className="min-w-[1200px]">
        <DataTableHeader>
          <DataTableRow className="hover:bg-transparent">
            <DataTableHead>Camera name</DataTableHead>
            <DataTableHead>School</DataTableHead>
            <DataTableHead>Classroom</DataTableHead>
            <DataTableHead>Status</DataTableHead>
            <DataTableHead>Default quality</DataTableHead>
            <DataTableHead>Desired state</DataTableHead>
            <DataTableHead>Schedule reason</DataTableHead>
            <DataTableHead>Last segment</DataTableHead>
            <DataTableHead>Open alerts</DataTableHead>
            <DataTableHead>Created at</DataTableHead>
            <DataTableHead className="text-right">Actions</DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {cameras.map((camera) => {
            const isDisabled = camera.status === "DISABLED";
            const isActing = actingCameraId === camera.id;
            return (
              <DataTableRow key={camera.id}>
                <DataTableCell className="font-medium text-slate-900">
                  {camera.name}
                </DataTableCell>
                <DataTableCell className="text-slate-500">
                  {camera.schoolName ?? "N/A"}
                </DataTableCell>
                <DataTableCell className="text-slate-500">
                  {camera.classroomName ?? "N/A"}
                </DataTableCell>
                <DataTableCell>
                  <CameraStatusBadge status={camera.status} />
                </DataTableCell>
                <DataTableCell>
                  <CameraQualityBadge quality={camera.defaultQuality} />
                </DataTableCell>
                <DataTableCell className="text-slate-500">
                  {camera.desiredState ?? "N/A"}
                </DataTableCell>
                <DataTableCell className="max-w-[200px] truncate text-slate-500">
                  {camera.scheduleReason ?? "N/A"}
                </DataTableCell>
                <DataTableCell className="text-slate-500">
                  {formatDateTime(camera.lastSegmentAt)}
                </DataTableCell>
                <DataTableCell>{formatNumber(camera.openAlerts)}</DataTableCell>
                <DataTableCell className="text-slate-500">
                  {formatDateTime(camera.createdAt)}
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/cameras/${camera.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        View
                      </Link>
                      {canManage ? (
                        <>
                          <Link
                            href={`/cameras/${camera.id}?tab=configuration`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            Edit
                          </Link>
                          {isDisabled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActing}
                              onClick={() => onEnable?.(camera)}
                            >
                              Enable
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActing}
                              onClick={() => onDisable?.(camera)}
                            >
                              Disable
                            </Button>
                          )}
                        </>
                      ) : null}
                      <Link
                        href={healthLink(camera)}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        View Health
                      </Link>
                    </div>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </DataTableRoot>
  );
}

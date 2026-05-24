import Link from "next/link";

import { CameraStatusBadge } from "@/components/camera-monitoring/CameraStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import type { NormalizedCameraStatus } from "@/lib/admin/camera-monitoring-types";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type CameraStatusTableProps = {
  cameras: NormalizedCameraStatus[];
  schoolName?: string;
};

function formatOptional(value: string | number | null | undefined, fallback = "N/A") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function healthLink(camera: NormalizedCameraStatus) {
  const params = new URLSearchParams();
  if (camera.schoolName) params.set("schoolName", camera.schoolName);
  if (camera.classroomName) params.set("classroomName", camera.classroomName);
  const query = params.toString();
  return `/cameras/${camera.id}/health${query ? `?${query}` : ""}`;
}

export function CameraStatusTable({ cameras, schoolName }: CameraStatusTableProps) {
  if (cameras.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No cameras found for this school.</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Camera</th>
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Classroom</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Desired state</th>
              <th className="px-4 py-3 font-medium">Schedule reason</th>
              <th className="px-4 py-3 font-medium">Quality</th>
              <th className="px-4 py-3 font-medium">Last segment</th>
              <th className="px-4 py-3 font-medium">Stream lag (s)</th>
              <th className="px-4 py-3 font-medium">Segment age (m)</th>
              <th className="px-4 py-3 font-medium">Open alerts</th>
              <th className="px-4 py-3 font-medium">Last health event</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((camera) => (
              <tr key={camera.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{camera.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {camera.schoolName ?? schoolName ?? "N/A"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatOptional(camera.classroomName)}
                </td>
                <td className="px-4 py-3">
                  <CameraStatusBadge status={camera.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatOptional(camera.desiredState)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatOptional(camera.scheduleReason)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatOptional(camera.defaultQuality)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(camera.lastSegmentAt)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {camera.streamLagSeconds ?? "N/A"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {camera.lastSegmentAgeMinutes ?? "N/A"}
                </td>
                <td className="px-4 py-3">{formatNumber(camera.openAlerts)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatOptional(camera.lastHealthEvent)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={healthLink(camera)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    View Health
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

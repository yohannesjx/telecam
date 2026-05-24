"use client";

import type { CameraQuality, NormalizedCamera } from "@/lib/admin/cameras-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NormalizedSchool } from "@/lib/admin/camera-monitoring-types";

export const SELECT_CLASS =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type CamerasFiltersProps = {
  schools: NormalizedSchool[];
  schoolId: string;
  status: string;
  quality: string;
  search: string;
  onSchoolIdChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onQualityChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  lockSchool?: boolean;
};

export function filterCameras(
  cameras: NormalizedCamera[],
  filters: { status: string; quality: string; search: string },
): NormalizedCamera[] {
  const q = filters.search.trim().toLowerCase();
  return cameras.filter((camera) => {
    if (filters.status !== "all" && camera.status !== filters.status) return false;
    if (filters.quality !== "all" && camera.defaultQuality !== filters.quality) return false;
    if (!q) return true;
    const haystack = [
      camera.name,
      camera.schoolName,
      camera.classroomName,
      camera.id,
      camera.desiredState,
      camera.scheduleReason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function CamerasFilters({
  schools,
  schoolId,
  status,
  quality,
  search,
  onSchoolIdChange,
  onStatusChange,
  onQualityChange,
  onSearchChange,
  lockSchool = false,
}: CamerasFiltersProps) {
  return (
    <div className="surface-filter grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="camera-school">School</Label>
        <select
          id="camera-school"
          className={SELECT_CLASS}
          value={schoolId}
          disabled={lockSchool}
          onChange={(e) => onSchoolIdChange(e.target.value)}
        >
          <option value="">Select a school</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="camera-status">Status</Label>
        <select
          id="camera-status"
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
          <option value="ERROR">Error</option>
          <option value="STOPPED">Stopped</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="camera-quality">Quality</Label>
        <select
          id="camera-quality"
          className={SELECT_CLASS}
          value={quality}
          onChange={(e) => onQualityChange(e.target.value)}
        >
          <option value="all">All qualities</option>
          {( ["low_240p", "sd_360p", "sd_480p"] as CameraQuality[]).map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="camera-search">Search</Label>
        <Input
          id="camera-search"
          placeholder="Name, classroom, school..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUDIT_ACTION_OPTIONS } from "@/lib/admin/audit-logs-utils";
import type { NormalizedSchool } from "@/lib/admin/camera-monitoring-types";
import type { NormalizedCamera } from "@/lib/admin/cameras-types";

type AuditLogsFiltersProps = {
  schools: NormalizedSchool[];
  cameras: NormalizedCamera[];
  schoolId: string;
  userId: string;
  cameraId: string;
  action: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  onSchoolIdChange: (value: string) => void;
  onUserIdChange: (value: string) => void;
  onCameraIdChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

export function AuditLogsFilters({
  schools,
  cameras,
  schoolId,
  userId,
  cameraId,
  action,
  dateFrom,
  dateTo,
  search,
  onSchoolIdChange,
  onUserIdChange,
  onCameraIdChange,
  onActionChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
}: AuditLogsFiltersProps) {
  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="surface-filter grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="audit-school">School</Label>
        <select
          id="audit-school"
          className={selectClass}
          value={schoolId}
          onChange={(e) => onSchoolIdChange(e.target.value)}
        >
          <option value="">All schools</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-user">User ID</Label>
        <Input
          id="audit-user"
          placeholder="UUID or search below"
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-camera">Camera</Label>
        <select
          id="audit-camera"
          className={selectClass}
          value={cameraId}
          onChange={(e) => onCameraIdChange(e.target.value)}
          disabled={!schoolId}
        >
          <option value="">{schoolId ? "All cameras" : "Select school first"}</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.name || camera.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-action">Action</Label>
        <select
          id="audit-action"
          className={selectClass}
          value={action}
          onChange={(e) => onActionChange(e.target.value)}
        >
          {AUDIT_ACTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-from">From</Label>
        <Input
          id="audit-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-to">To</Label>
        <Input
          id="audit-to"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>

      <div className="space-y-2 md:col-span-2 xl:col-span-3">
        <Label htmlFor="audit-search">Search</Label>
        <Input
          id="audit-search"
          placeholder="Action, user, school, camera, IP, metadata…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

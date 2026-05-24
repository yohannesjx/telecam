"use client";

import type {
  CameraStatusFilter,
  NormalizedSchool,
} from "@/lib/admin/camera-monitoring-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS: { value: CameraStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "stopped_by_schedule", label: "Stopped by schedule" },
  { value: "no_recent_segment", label: "No recent segment" },
  { value: "error", label: "Error" },
  { value: "disabled", label: "Disabled" },
];

type CameraStatusFiltersProps = {
  schools: NormalizedSchool[];
  schoolId: string;
  onSchoolChange: (schoolId: string) => void;
  manualSchoolId: string;
  onManualSchoolIdChange: (value: string) => void;
  showManualSchoolEntry: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: CameraStatusFilter;
  onStatusFilterChange: (value: CameraStatusFilter) => void;
};

export function CameraStatusFilters({
  schools,
  schoolId,
  onSchoolChange,
  manualSchoolId,
  onManualSchoolIdChange,
  showManualSchoolEntry,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: CameraStatusFiltersProps) {
  return (
    <div className="surface-filter grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {showManualSchoolEntry ? (
        <div className="space-y-2">
          <Label htmlFor="manual-school-id">School ID</Label>
          <Input
            id="manual-school-id"
            placeholder="Enter school UUID"
            value={manualSchoolId}
            onChange={(e) => onManualSchoolIdChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Technicians: enter a school ID to load camera status.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="school-select">School</Label>
          <select
            id="school-select"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={schoolId}
            onChange={(e) => onSchoolChange(e.target.value)}
          >
            <option value="">Select a school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="camera-search">Search</Label>
        <Input
          id="camera-search"
          placeholder="Camera, classroom, school..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status-filter">Status</Label>
        <select
          id="status-filter"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as CameraStatusFilter)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

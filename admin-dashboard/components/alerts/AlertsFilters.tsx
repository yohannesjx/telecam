"use client";

import type {
  AlertSeverityFilter,
  AlertStatusFilter,
} from "@/lib/admin/alerts-types";
import type { NormalizedSchool } from "@/lib/admin/camera-monitoring-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS: { value: AlertStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
];

const SEVERITY_OPTIONS: { value: AlertSeverityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const ALERT_TYPE_OPTIONS = [
  "All",
  "CAMERA_OFFLINE",
  "CAMERA_ONLINE",
  "NO_SEGMENT_UPLOADED",
  "CAMERA_NO_SEGMENT_UPLOADED",
  "CAMERA_RESUMED",
  "STREAM_WORKER_STALE",
  "SCHOOL_OFFLINE",
  "UPLOAD_FAILURE",
  "FFMPEG_FAILURE",
] as const;

type AlertsFiltersProps = {
  schools: NormalizedSchool[];
  status: AlertStatusFilter;
  severity: AlertSeverityFilter;
  alertType: string;
  schoolId: string;
  cameraId: string;
  search: string;
  onStatusChange: (value: AlertStatusFilter) => void;
  onSeverityChange: (value: AlertSeverityFilter) => void;
  onAlertTypeChange: (value: string) => void;
  onSchoolIdChange: (value: string) => void;
  onCameraIdChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

export function AlertsFilters({
  schools,
  status,
  severity,
  alertType,
  schoolId,
  cameraId,
  search,
  onStatusChange,
  onSeverityChange,
  onAlertTypeChange,
  onSchoolIdChange,
  onCameraIdChange,
  onSearchChange,
}: AlertsFiltersProps) {
  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="surface-filter grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <div className="space-y-2">
        <Label htmlFor="alert-status">Status</Label>
        <select
          id="alert-status"
          className={selectClass}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as AlertStatusFilter)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-severity">Severity</Label>
        <select
          id="alert-severity"
          className={selectClass}
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as AlertSeverityFilter)}
        >
          {SEVERITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-type">Alert type</Label>
        <select
          id="alert-type"
          className={selectClass}
          value={alertType}
          onChange={(e) => onAlertTypeChange(e.target.value)}
        >
          {ALERT_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option === "All" ? "all" : option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-school">School</Label>
        <select
          id="alert-school"
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
        <Label htmlFor="alert-camera">Camera ID</Label>
        <Input
          id="alert-camera"
          placeholder="Filter by camera UUID"
          value={cameraId}
          onChange={(e) => onCameraIdChange(e.target.value)}
        />
      </div>

      <div className="space-y-2 md:col-span-2 xl:col-span-1 2xl:col-span-1">
        <Label htmlFor="alert-search">Search</Label>
        <Input
          id="alert-search"
          placeholder="Message, type, school, camera..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

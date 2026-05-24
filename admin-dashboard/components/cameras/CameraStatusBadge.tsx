import type { CameraStatus } from "@/lib/admin/cameras-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<CameraStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  ONLINE: "Online",
  OFFLINE: "Offline",
  ERROR: "Error",
  STOPPED: "Stopped",
  UNKNOWN: "Unknown",
};

export function CameraStatusBadge({
  status,
  className,
}: {
  status: CameraStatus | string;
  className?: string;
}) {
  const key = (String(status).toUpperCase() as CameraStatus) in STATUS_LABEL
    ? (String(status).toUpperCase() as CameraStatus)
    : "UNKNOWN";

  return (
    <StatusBadge
      label={STATUS_LABEL[key]}
      status={key.toLowerCase()}
      className={cn(className)}
    />
  );
}

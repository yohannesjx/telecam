import type { CameraOperationalStatus } from "@/lib/admin/camera-monitoring-types";
import { Badge } from "@/components/ui/badge";
import {
  cameraOperationalStatusBadgeClass,
  cameraOperationalStatusLabel,
} from "@/lib/format";

type CameraStatusBadgeProps = {
  status: CameraOperationalStatus;
  className?: string;
};

export function CameraStatusBadge({ status, className }: CameraStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cameraOperationalStatusBadgeClass(status)}>
      {cameraOperationalStatusLabel(status)}
    </Badge>
  );
}

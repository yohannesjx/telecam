import { Badge } from "@/components/ui/badge";

export function CameraQualityBadge({ quality }: { quality?: string | null }) {
  return (
    <Badge variant="secondary" className="font-mono text-xs">
      {quality ?? "N/A"}
    </Badge>
  );
}

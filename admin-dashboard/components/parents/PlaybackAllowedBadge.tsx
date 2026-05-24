import { Badge } from "@/components/ui/badge";

export function PlaybackAllowedBadge({ value }: { value?: boolean | null }) {
  if (value === true) return <Badge className="bg-emerald-600">Yes</Badge>;
  if (value === false) return <Badge variant="secondary">No</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

import { cn } from "@/lib/utils";
import {
  healthLevelTone,
  resolveStatusTone,
  statusToneClasses,
  type StatusTone,
} from "@/lib/ui/status-styles";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  status?: string;
  healthLevel?: "good" | "warning" | "critical";
  className?: string;
};

export function StatusBadge({
  label,
  tone,
  status,
  healthLevel,
  className,
}: StatusBadgeProps) {
  const resolvedTone =
    tone ??
    (healthLevel ? healthLevelTone(healthLevel) : status ? resolveStatusTone(status) : "muted");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusToneClasses[resolvedTone],
        className,
      )}
    >
      {label}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

type DashboardMetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  progress?: number;
  className?: string;
};

export function DashboardMetricCard({
  label,
  value,
  hint,
  icon,
  badge,
  progress,
  className,
}: DashboardMetricCardProps) {
  return (
    <StatCard
      label={label}
      value={value}
      hint={hint}
      icon={icon}
      badge={badge}
      progress={progress}
      className={cn(className)}
    />
  );
}

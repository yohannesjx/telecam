import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { NormalizedDashboard } from "@/lib/admin/dashboard-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type AlertsSummaryProps = {
  data: NormalizedDashboard;
};

export function AlertsSummary({ data }: AlertsSummaryProps) {
  const items = [
    { label: "Open alerts", value: data.openAlerts, tone: "warning" as const },
    { label: "Critical alerts", value: data.criticalAlerts, tone: "danger" as const },
    { label: "Warning alerts", value: data.warningAlerts, tone: "warning" as const },
  ];

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-slate-400" />
          Recent Alerts Summary
        </span>
      }
      description="Open, critical, and warning alert counts"
    >
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
          >
            <span className="text-sm font-medium text-slate-700">{item.label}</span>
            <StatusBadge label={formatNumber(item.value)} tone={item.tone} />
          </div>
        ))}

        <Link
          href="/alerts"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-2 w-full border-slate-200 hover:bg-slate-50",
          )}
        >
          View alerts
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </SectionCard>
  );
}

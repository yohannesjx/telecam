import type { AlertsSummary } from "@/lib/admin/alerts-types";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { formatNumber } from "@/lib/format";
import { AlertTriangle, Bell, CheckCircle2, MessageSquareWarning, ShieldAlert } from "lucide-react";

type AlertsSummaryCardsProps = {
  summary: AlertsSummary;
};

export function AlertsSummaryCards({ summary }: AlertsSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <DashboardMetricCard label="Open alerts" value={formatNumber(summary.open)} icon={Bell} />
      <DashboardMetricCard
        label="Critical alerts"
        value={formatNumber(summary.critical)}
        icon={ShieldAlert}
      />
      <DashboardMetricCard
        label="Warning alerts"
        value={formatNumber(summary.warning)}
        icon={AlertTriangle}
      />
      <DashboardMetricCard
        label="Acknowledged alerts"
        value={formatNumber(summary.acknowledged)}
        icon={MessageSquareWarning}
      />
      <DashboardMetricCard
        label="Resolved today"
        value={formatNumber(summary.resolvedToday)}
        icon={CheckCircle2}
      />
      <DashboardMetricCard
        label="Telegram delivery failures"
        value={formatNumber(summary.telegramFailures)}
        icon={AlertTriangle}
      />
    </div>
  );
}

import {
  CreditCard,
  FileText,
  LogIn,
  ShieldAlert,
  UserCog,
  VideoOff,
} from "lucide-react";

import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import type { AuditLogsSummary } from "@/lib/admin/audit-logs-types";
import { formatNumber } from "@/lib/format";

type AuditLogsSummaryCardsProps = {
  summary: AuditLogsSummary;
};

export function AuditLogsSummaryCards({ summary }: AuditLogsSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <DashboardMetricCard
        label="Total logs"
        value={formatNumber(summary.total)}
        icon={FileText}
      />
      <DashboardMetricCard
        label="Login failures"
        value={formatNumber(summary.loginFailures)}
        icon={LogIn}
      />
      <DashboardMetricCard
        label="Playback denials"
        value={formatNumber(summary.playbackDenials)}
        icon={VideoOff}
      />
      <DashboardMetricCard
        label="Admin actions"
        value={formatNumber(summary.adminActions)}
        icon={UserCog}
      />
      <DashboardMetricCard
        label="Billing actions"
        value={formatNumber(summary.billingActions)}
        icon={CreditCard}
      />
      <DashboardMetricCard
        label="Alert actions"
        value={formatNumber(summary.alertActions)}
        icon={ShieldAlert}
      />
    </div>
  );
}

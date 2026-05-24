"use client";

import {
  AlertTriangle,
  Camera,
  CameraOff,
  CreditCard,
  HardDrive,
  LogIn,
  PlayCircle,
  Server,
  ShieldAlert,
  Users,
  Video,
  Wallet,
  XCircle,
} from "lucide-react";

import { AlertsSummary } from "@/components/dashboard/AlertsSummary";
import { CameraStatusOverview } from "@/components/dashboard/CameraStatusOverview";
import { DashboardError } from "@/components/dashboard/DashboardError";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { SystemHealthCard } from "@/components/dashboard/SystemHealthCard";
import { WorkerHealthSummary } from "@/components/dashboard/WorkerHealthSummary";
import { useCan } from "@/hooks/use-permissions";
import { useDashboardQuery } from "@/lib/admin/use-dashboard-query";
import {
  formatCurrencyEtb,
  formatNumber,
  formatPercent,
  formatStorage,
} from "@/lib/format";
import { calculateHealthScore, workerSummaryLabel } from "@/lib/health-score";

export function DashboardOverview() {
  const { data, isLoading, isError, isFetching, refetch, error } = useDashboardQuery();
  const canViewBilling = useCan("billing:view");
  const canViewParents = useCan("parents:view");

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not load dashboard overview.";
    return (
      <DashboardError
        message={message.includes("401") ? "Could not load dashboard overview." : message}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const health = calculateHealthScore(data);
  const cameraDenominator = data.camerasActive || data.camerasTotal;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SystemHealthCard health={health} />

        <DashboardMetricCard
          label="Cameras Healthy %"
          value={formatPercent(data.camerasHealthyPercent, "N/A")}
          hint={`${formatNumber(data.camerasHealthy)} / ${formatNumber(cameraDenominator)} cameras healthy`}
          icon={Video}
          progress={data.camerasHealthyPercent ?? undefined}
        />

        <DashboardMetricCard
          label="Open Alerts"
          value={formatNumber(data.openAlerts)}
          hint="Requires review"
          icon={AlertTriangle}
        />

        <DashboardMetricCard
          label="Critical Alerts"
          value={formatNumber(data.criticalAlerts)}
          hint={data.criticalAlerts > 0 ? "Immediate attention" : "None active"}
          icon={ShieldAlert}
        />

        <DashboardMetricCard
          label="Active Cameras"
          value={formatNumber(data.camerasActive)}
          hint="Streaming or ready"
          icon={Camera}
        />

        <DashboardMetricCard
          label="Offline Cameras"
          value={formatNumber(data.camerasOffline)}
          hint="Check connectivity"
          icon={CameraOff}
        />

        {canViewParents ? (
          <DashboardMetricCard
            label="Active Parents"
            value={formatNumber(data.parentsActive)}
            hint={`${formatNumber(data.parentsTotal)} total parents`}
            icon={Users}
          />
        ) : null}

        {canViewBilling ? (
          <>
            <DashboardMetricCard
              label="Active Subscriptions"
              value={formatNumber(data.subscriptionsActive)}
              hint={`${formatNumber(data.subscriptionsTrial)} on trial`}
              icon={CreditCard}
            />

            <DashboardMetricCard
              label="Monthly Revenue"
              value={formatCurrencyEtb(data.monthlyRevenueEtb)}
              hint="Current month"
              icon={Wallet}
            />

            <DashboardMetricCard
              label="Pending Payments"
              value={formatCurrencyEtb(data.pendingPaymentsEtb)}
              hint="Awaiting collection"
              icon={CreditCard}
            />
          </>
        ) : null}

        <DashboardMetricCard
          label="Playback Requests Today"
          value={formatNumber(data.playbackRequestsToday)}
          hint="Parent playback access"
          icon={PlayCircle}
        />

        <DashboardMetricCard
          label="Denied Playback Today"
          value={formatNumber(data.playbackDeniedToday)}
          hint="Outside schedule or policy"
          icon={XCircle}
        />

        <DashboardMetricCard
          label="Login Failures Today"
          value={formatNumber(data.loginFailuresToday)}
          hint="Failed auth attempts"
          icon={LogIn}
        />

        <DashboardMetricCard
          label="Storage Usage"
          value={formatStorage(data.storageGb, data.storageBytes)}
          hint="Cloud recording storage"
          icon={HardDrive}
        />

        <DashboardMetricCard
          label="Worker Status"
          value={
            data.workersTotal > 0
              ? `${formatNumber(data.workersHealthy)} / ${formatNumber(data.workersTotal)}`
              : "Unknown"
          }
          hint={workerSummaryLabel(data)}
          icon={Server}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CameraStatusOverview data={data} />
        <AlertsSummary data={data} />
      </div>

      <WorkerHealthSummary data={data} />
    </div>
  );
}

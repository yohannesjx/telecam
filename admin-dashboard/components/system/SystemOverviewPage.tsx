"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { SystemError } from "@/components/system/SystemError";
import { SystemNavTabs } from "@/components/system/SystemNavTabs";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { SystemSummaryCards } from "@/components/system/SystemSummaryCards";
import { SystemStatusBadge } from "@/components/system/SystemStatusBadge";
import { Button } from "@/components/ui/button";
import {
  buildSystemNotes,
  computeHealthScore,
  countWorkersByStatus,
  deriveOverallSystemStatus,
} from "@/lib/admin/system-health";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  canViewSystem,
  canViewSystemRetention,
  canViewSystemWorkers,
  useHealthSummaryQuery,
  useRetentionStatusQuery,
  useSchedulerStatusQuery,
  useStorageUsageQuery,
  useWorkersQuery,
} from "@/lib/admin/use-system-queries";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

function SectionError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm">
      <p className="text-muted-foreground">{title}</p>
      <Button variant="link" className="h-auto p-0" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function SystemOverviewPage() {
  const { user } = useAuth();
  const allowed = canViewSystem(user?.role);
  const workersAllowed = canViewSystemWorkers(user?.role);
  const retentionAllowed = canViewSystemRetention(user?.role);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const healthQuery = useHealthSummaryQuery(allowed);
  const workersQuery = useWorkersQuery(allowed && workersAllowed);
  const schedulerQuery = useSchedulerStatusQuery(allowed);
  const retentionQuery = useRetentionStatusQuery(allowed && retentionAllowed);
  const storageQuery = useStorageUsageQuery(allowed, true);

  const queries = [healthQuery, schedulerQuery, storageQuery, workersQuery, retentionQuery];

  useEffect(() => {
    const latest = Math.max(...queries.map((q) => q.dataUpdatedAt ?? 0));
    if (latest > 0) setLastUpdated(new Date(latest));
  }, [healthQuery.dataUpdatedAt, workersQuery.dataUpdatedAt, schedulerQuery.dataUpdatedAt, retentionQuery.dataUpdatedAt, storageQuery.dataUpdatedAt]);

  const workers = workersQuery.data ?? [];
  const workerCounts = useMemo(() => countWorkersByStatus(workers), [workers]);
  const health = healthQuery.data ?? null;
  const scheduler = schedulerQuery.data ?? null;
  const retention = retentionQuery.data ?? null;
  const storage = storageQuery.data ?? null;

  const score = useMemo(
    () => computeHealthScore(health, workers),
    [health, workers],
  );

  const overallStatus = useMemo(
    () => deriveOverallSystemStatus(health, workers, scheduler, retention),
    [health, workers, scheduler, retention],
  );

  const notes = useMemo(() => buildSystemNotes(health, workers), [health, workers]);

  const handleRefresh = () => {
    void healthQuery.refetch();
    void schedulerQuery.refetch();
    void storageQuery.refetch();
    if (workersAllowed) void workersQuery.refetch();
    if (retentionAllowed) void retentionQuery.refetch();
  };

  if (!allowed) {
    return <SystemError message="You do not have permission to view system health." />;
  }

  const initialLoading =
    healthQuery.isLoading &&
    schedulerQuery.isLoading &&
    storageQuery.isLoading &&
    (!workersAllowed || workersQuery.isLoading);

  if (initialLoading) return <SystemSkeleton />;

  const allFailed =
    healthQuery.isError &&
    schedulerQuery.isError &&
    storageQuery.isError &&
    (!workersAllowed || workersQuery.isError);

  if (allFailed) {
    const err = healthQuery.error ?? workersQuery.error;
    if (isForbiddenError(err) || (err instanceof ApiError && err.status === 403)) {
      return <SystemError message={FORBIDDEN_MESSAGE} />;
    }
    return (
      <SystemError message="Could not load system health." onRetry={handleRefresh} isRetrying={healthQuery.isFetching} />
    );
  }

  return (
    <div className="space-y-6">
      <SystemNavTabs />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SystemStatusBadge status={overallStatus} />
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            {lastUpdated ? formatTimeOnly(lastUpdated) : healthQuery.isFetching ? "Refreshing…" : "—"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={healthQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${healthQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <SystemSummaryCards
        overallStatus={overallStatus}
        score={score}
        healthyWorkers={workerCounts.healthy}
        staleWorkers={workerCounts.stale}
        criticalAlerts={health?.criticalAlerts ?? null}
        schedulerState={scheduler?.currentState ?? scheduler?.reason ?? null}
        retentionStatus={retention?.status ?? null}
        retentionDryRun={retention?.dryRun ?? null}
        storageGb={storage?.summary?.totalGb ?? null}
        estimatedCostUsd={storage?.summary?.estimatedCostUsd ?? null}
      />

      {notes.length > 0 ? (
        <div className="surface-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Recent system warnings</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {healthQuery.isError ? (
          <SectionError title="Could not load health summary." onRetry={() => void healthQuery.refetch()} />
        ) : (
          <div className="surface-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Health summary</h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Schools</dt><dd className="font-medium">{health?.schoolsTotal ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Cameras</dt><dd className="font-medium">{health?.camerasTotal ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Offline cameras</dt><dd className="font-medium">{health?.camerasOffline ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Open alerts</dt><dd className="font-medium">{health?.openAlerts ?? "—"}</dd></div>
            </dl>
          </div>
        )}

        {workersAllowed && workersQuery.isError ? (
          <SectionError title="Could not load workers." onRetry={() => void workersQuery.refetch()} />
        ) : workersAllowed ? (
          <div className="surface-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Workers</h3>
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workers found.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {workers.map((w) => (
                  <li key={w.id ?? w.name} className="flex items-center justify-between gap-2">
                    <span>{w.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{w.effectiveStatus ?? w.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {schedulerQuery.isError ? (
          <SectionError title="Could not load scheduler status." onRetry={() => void schedulerQuery.refetch()} />
        ) : (
          <div className="surface-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Scheduler</h3>
            <p className="text-sm">{scheduler?.reason ?? scheduler?.currentState ?? "Scheduler status is unavailable."}</p>
          </div>
        )}

        {retentionAllowed && retentionQuery.isError ? (
          <SectionError title="Could not load retention status." onRetry={() => void retentionQuery.refetch()} />
        ) : retentionAllowed ? (
          <div className="surface-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Retention</h3>
            <p className="text-sm">{retention?.message ?? retention?.workerName ?? "Retention status is unavailable."}</p>
          </div>
        ) : null}

        {storageQuery.isError ? (
          <SectionError title="Could not load storage usage." onRetry={() => void storageQuery.refetch()} />
        ) : (
          <div className="surface-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Storage</h3>
            <p className="text-sm text-muted-foreground">
              {storage?.summary?.totalGb != null
                ? `${storage.summary.totalGb.toFixed(2)} GB across ${storage.summary.schoolsCount} school(s)`
                : "No storage usage records found."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

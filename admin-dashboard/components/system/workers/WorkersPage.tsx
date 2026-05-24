"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { SystemError } from "@/components/system/SystemError";
import { SystemNavTabs } from "@/components/system/SystemNavTabs";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { WorkerDetailDrawer } from "@/components/system/workers/WorkerDetailDrawer";
import { WorkersTable } from "@/components/system/workers/WorkersTable";
import { Button } from "@/components/ui/button";
import { countWorkersByStatus } from "@/lib/admin/system-health";
import type { NormalizedWorker } from "@/lib/admin/system-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { canViewSystemWorkers, useWorkersQuery } from "@/lib/admin/use-system-queries";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

export function WorkersPage() {
  const { user } = useAuth();
  const allowed = canViewSystemWorkers(user?.role);
  const workersQuery = useWorkersQuery(allowed);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<NormalizedWorker | null>(null);

  useEffect(() => {
    if (workersQuery.dataUpdatedAt) setLastUpdated(new Date(workersQuery.dataUpdatedAt));
  }, [workersQuery.dataUpdatedAt]);

  const workers = useMemo(() => {
    const list = workersQuery.data ?? [];
    return [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [workersQuery.data]);

  const counts = useMemo(() => countWorkersByStatus(workers), [workers]);

  if (!allowed) {
    return <SystemError message="You do not have permission to view workers." />;
  }

  if (workersQuery.isLoading && !workersQuery.data) return <SystemSkeleton />;

  if (workersQuery.isError) {
    const err = workersQuery.error;
    if (isForbiddenError(err) || (err instanceof ApiError && err.status === 403)) {
      return <SystemError message={FORBIDDEN_MESSAGE} />;
    }
    return (
      <SystemError
        message="Could not load workers."
        onRetry={() => void workersQuery.refetch()}
        isRetrying={workersQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SystemNavTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {counts.healthy} healthy · {counts.stale} stale · {counts.total} total · Last updated:{" "}
          {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
        </p>
        <Button variant="outline" size="sm" onClick={() => void workersQuery.refetch()} disabled={workersQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${workersQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <WorkersTable workers={workers} onView={setSelected} />
      <WorkerDetailDrawer worker={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </div>
  );
}

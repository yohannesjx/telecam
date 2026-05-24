"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { SystemError } from "@/components/system/SystemError";
import { SystemNavTabs } from "@/components/system/SystemNavTabs";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { SchedulerDetails } from "@/components/system/scheduler/SchedulerDetails";
import { SchedulerStatusCards } from "@/components/system/scheduler/SchedulerStatusCards";
import { Button } from "@/components/ui/button";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { canViewSystem, useSchedulerStatusQuery } from "@/lib/admin/use-system-queries";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

export function SchedulerPage() {
  const { user } = useAuth();
  const allowed = canViewSystem(user?.role);
  const schedulerQuery = useSchedulerStatusQuery(allowed);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (schedulerQuery.dataUpdatedAt) setLastUpdated(new Date(schedulerQuery.dataUpdatedAt));
  }, [schedulerQuery.dataUpdatedAt]);

  if (!allowed) {
    return <SystemError message="You do not have permission to view scheduler status." />;
  }

  if (schedulerQuery.isLoading && !schedulerQuery.data) return <SystemSkeleton />;

  if (schedulerQuery.isError) {
    const err = schedulerQuery.error;
    if (isForbiddenError(err) || (err instanceof ApiError && err.status === 403)) {
      return <SystemError message={FORBIDDEN_MESSAGE} />;
    }
    return (
      <SystemError
        message="Could not load scheduler status."
        onRetry={() => void schedulerQuery.refetch()}
        isRetrying={schedulerQuery.isFetching}
      />
    );
  }

  const scheduler = schedulerQuery.data;
  if (!scheduler) {
    return (
      <div className="space-y-6">
        <SystemNavTabs />
        <p className="text-sm text-muted-foreground">Scheduler status is unavailable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SystemNavTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
        </p>
        <Button variant="outline" size="sm" onClick={() => void schedulerQuery.refetch()} disabled={schedulerQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${schedulerQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <SchedulerStatusCards scheduler={scheduler} />
      <SchedulerDetails scheduler={scheduler} />
    </div>
  );
}

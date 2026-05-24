"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { SystemError } from "@/components/system/SystemError";
import { SystemNavTabs } from "@/components/system/SystemNavTabs";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { RetentionDetails } from "@/components/system/retention/RetentionDetails";
import { RetentionStatusCards } from "@/components/system/retention/RetentionStatusCards";
import { Button } from "@/components/ui/button";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { canViewSystemRetention, useRetentionStatusQuery } from "@/lib/admin/use-system-queries";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

export function RetentionPage() {
  const { user } = useAuth();
  const allowed = canViewSystemRetention(user?.role);
  const retentionQuery = useRetentionStatusQuery(allowed);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (retentionQuery.dataUpdatedAt) setLastUpdated(new Date(retentionQuery.dataUpdatedAt));
  }, [retentionQuery.dataUpdatedAt]);

  if (!allowed) {
    return <SystemError message="You do not have permission to view retention status." />;
  }

  if (retentionQuery.isLoading && !retentionQuery.data) return <SystemSkeleton />;

  if (retentionQuery.isError) {
    const err = retentionQuery.error;
    if (isForbiddenError(err) || (err instanceof ApiError && err.status === 403)) {
      return <SystemError message={FORBIDDEN_MESSAGE} />;
    }
    return (
      <SystemError
        message="Could not load retention status."
        onRetry={() => void retentionQuery.refetch()}
        isRetrying={retentionQuery.isFetching}
      />
    );
  }

  const data = retentionQuery.data;
  if (!data) {
    return (
      <div className="space-y-6">
        <SystemNavTabs />
        <p className="text-sm text-muted-foreground">Retention status is unavailable.</p>
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
        <Button variant="outline" size="sm" onClick={() => void retentionQuery.refetch()} disabled={retentionQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${retentionQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <RetentionStatusCards retention={data} />
      <RetentionDetails retention={data} />
    </div>
  );
}

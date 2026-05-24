"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { SystemError } from "@/components/system/SystemError";
import { SystemNavTabs } from "@/components/system/SystemNavTabs";
import { SystemSkeleton } from "@/components/system/SystemSkeleton";
import { StorageCostNotice } from "@/components/system/storage/StorageCostNotice";
import { StorageSummaryCards } from "@/components/system/storage/StorageSummaryCards";
import { StorageUsageTable } from "@/components/system/storage/StorageUsageTable";
import { Button } from "@/components/ui/button";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { canViewSystem, useStorageUsageQuery } from "@/lib/admin/use-system-queries";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

export function StoragePage() {
  const { user } = useAuth();
  const allowed = canViewSystem(user?.role);
  const storageQuery = useStorageUsageQuery(allowed, true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (storageQuery.dataUpdatedAt) setLastUpdated(new Date(storageQuery.dataUpdatedAt));
  }, [storageQuery.dataUpdatedAt]);

  const rows = useMemo(() => {
    const list = storageQuery.data?.rows ?? [];
    return [...list].sort((a, b) => {
      const da = a.date ?? "";
      const db = b.date ?? "";
      return db.localeCompare(da);
    });
  }, [storageQuery.data?.rows]);

  const dailyGrowthGb = useMemo(() => {
    if (rows.length < 2) return null;
    const byDate = new Map<string, number>();
    for (const row of rows) {
      if (!row.date) continue;
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.gbUsed ?? 0));
    }
    const dates = [...byDate.keys()].sort();
    if (dates.length < 2) return null;
    const latest = byDate.get(dates[dates.length - 1]) ?? 0;
    const prev = byDate.get(dates[dates.length - 2]) ?? 0;
    return Math.max(0, latest - prev);
  }, [rows]);

  const oldestDate = rows.length > 0 ? rows[rows.length - 1]?.date : null;

  if (!allowed) {
    return <SystemError message="You do not have permission to view storage usage." />;
  }

  if (storageQuery.isLoading && !storageQuery.data) return <SystemSkeleton />;

  if (storageQuery.isError) {
    const err = storageQuery.error;
    if (isForbiddenError(err) || (err instanceof ApiError && err.status === 403)) {
      return <SystemError message={FORBIDDEN_MESSAGE} />;
    }
    return (
      <SystemError
        message="Could not load storage usage."
        onRetry={() => void storageQuery.refetch()}
        isRetrying={storageQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SystemNavTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
        </p>
        <Button variant="outline" size="sm" onClick={() => void storageQuery.refetch()} disabled={storageQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${storageQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <StorageCostNotice />
      <StorageSummaryCards
        summary={storageQuery.data?.summary}
        oldestDate={oldestDate}
        dailyGrowthGb={dailyGrowthGb}
      />
      <StorageUsageTable rows={rows} />
    </div>
  );
}

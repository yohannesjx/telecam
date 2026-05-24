"use client";

import Link from "next/link";
import { useMemo } from "react";

import { AlertSeverityBadge } from "@/components/alerts/AlertSeverityBadge";
import { AlertStatusBadge } from "@/components/alerts/AlertStatusBadge";
import { SchoolsError } from "@/components/schools/SchoolsError";
import { SchoolsSkeleton } from "@/components/schools/SchoolsSkeleton";
import { buttonVariants } from "@/components/ui/button";
import { useAlertsQuery } from "@/lib/admin/use-alerts-queries";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SchoolAlertsTab({ schoolId }: { schoolId: string }) {
  const alertsQuery = useAlertsQuery({ limit: 500 });

  const schoolAlerts = useMemo(() => {
    return (alertsQuery.data?.alerts ?? []).filter((a) => a.schoolId === schoolId);
  }, [alertsQuery.data?.alerts, schoolId]);

  const openAlerts = schoolAlerts.filter((a) => a.status === "open");
  const critical = schoolAlerts.filter((a) => a.severity === "critical");
  const warning = schoolAlerts.filter((a) => a.severity === "warning");
  const resolved = schoolAlerts
    .filter((a) => a.status === "resolved")
    .slice(0, 5);

  if (alertsQuery.isLoading) return <SchoolsSkeleton />;
  if (alertsQuery.isError) {
    return (
      <SchoolsError message="Could not load alerts." onRetry={() => void alertsQuery.refetch()} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/alerts?schoolId=${encodeURIComponent(schoolId)}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Open alerts center
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Open alerts</p>
          <p className="text-2xl font-semibold">{openAlerts.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Critical</p>
          <p className="text-2xl font-semibold">{critical.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Warning</p>
          <p className="text-2xl font-semibold">{warning.length}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3 font-medium">Recent alerts</div>
        {schoolAlerts.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No alerts for this school.</p>
        ) : (
          <ul className="divide-y">
            {[...openAlerts, ...resolved].slice(0, 12).map((alert) => (
              <li key={alert.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <AlertSeverityBadge severity={alert.severity} />
                  <AlertStatusBadge status={alert.status} />
                </div>
                <p className="text-sm font-medium">{alert.title || alert.type}</p>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(alert.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

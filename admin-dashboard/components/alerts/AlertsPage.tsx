"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ListEmptyState } from "@/components/common/ListEmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { AlertDetailDrawer } from "@/components/alerts/AlertDetailDrawer";
import { AlertsError } from "@/components/alerts/AlertsError";
import { AlertsFilters } from "@/components/alerts/AlertsFilters";
import { AlertsSkeleton } from "@/components/alerts/AlertsSkeleton";
import { AlertsSummaryCards } from "@/components/alerts/AlertsSummaryCards";
import { AlertsTable } from "@/components/alerts/AlertsTable";
import { Button } from "@/components/ui/button";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  computeAlertsSummary,
  enrichAlertsWithSchoolNames,
  filterAlertsClientSide,
} from "@/lib/admin/alerts-normalizer";
import type {
  AlertSeverityFilter,
  AlertStatusFilter,
  NormalizedAlert,
  NormalizedAlertDelivery,
} from "@/lib/admin/alerts-types";
import {
  useAcknowledgeAlertMutation,
  useAlertDeliveriesQuery,
  useAlertsQuery,
  useResolveAlertMutation,
} from "@/lib/admin/use-alerts-queries";
import { useSchoolsQuery } from "@/lib/admin/use-camera-monitoring-queries";
import { formatTimeOnly } from "@/lib/format";

export function AlertsPage() {
  const [status, setStatus] = useState<AlertStatusFilter>("all");
  const [severity, setSeverity] = useState<AlertSeverityFilter>("all");
  const [alertType, setAlertType] = useState("all");
  const [schoolId, setSchoolId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<NormalizedAlert | null>(null);
  const [actingAlertId, setActingAlertId] = useState<string | null>(null);

  const alertsQuery = useAlertsQuery({ limit: 500 });
  const deliveriesQuery = useAlertDeliveriesQuery();
  const schoolsQuery = useSchoolsQuery();
  const acknowledgeMutation = useAcknowledgeAlertMutation();
  const resolveMutation = useResolveAlertMutation();

  useEffect(() => {
    if (alertsQuery.dataUpdatedAt) {
      setLastUpdated(new Date(alertsQuery.dataUpdatedAt));
    }
  }, [alertsQuery.dataUpdatedAt]);

  const enrichedAlerts = useMemo(() => {
    const alerts = alertsQuery.data?.alerts ?? [];
    return enrichAlertsWithSchoolNames(alerts, schoolsQuery.data ?? []);
  }, [alertsQuery.data?.alerts, schoolsQuery.data]);

  const filteredAlerts = useMemo(
    () =>
      filterAlertsClientSide(enrichedAlerts, {
        status,
        severity,
        alertType,
        schoolId: schoolId || undefined,
        cameraId: cameraId || undefined,
        search: debouncedSearch,
      }),
    [enrichedAlerts, status, severity, alertType, schoolId, cameraId, debouncedSearch],
  );

  const pagination = useClientPagination(filteredAlerts, {
    resetDeps: [debouncedSearch, status, severity, alertType, schoolId, cameraId],
  });

  const deliveriesByAlert = useMemo(() => {
    const map = new Map<string, NormalizedAlertDelivery[]>();
    for (const delivery of deliveriesQuery.data ?? []) {
      const list = map.get(delivery.alertId) ?? [];
      list.push(delivery);
      map.set(delivery.alertId, list);
    }
    return map;
  }, [deliveriesQuery.data]);

  const summary = useMemo(
    () => computeAlertsSummary(enrichedAlerts, deliveriesQuery.data ?? []),
    [enrichedAlerts, deliveriesQuery.data],
  );

  const handleRefresh = () => {
    void alertsQuery.refetch();
    void deliveriesQuery.refetch();
    void schoolsQuery.refetch();
  };

  const handleAcknowledge = async (alert: NormalizedAlert) => {
    setActingAlertId(alert.id);
    try {
      await acknowledgeMutation.mutateAsync(alert.id);
      toast.success("Alert acknowledged.");
      setSelectedAlert((current) =>
        current?.id === alert.id ? { ...current, status: "acknowledged" } : current,
      );
    } catch {
      toast.error("Could not acknowledge alert.");
    } finally {
      setActingAlertId(null);
    }
  };

  const handleResolve = async (alert: NormalizedAlert) => {
    setActingAlertId(alert.id);
    try {
      await resolveMutation.mutateAsync(alert.id);
      toast.success("Alert resolved.");
      setSelectedAlert((current) =>
        current?.id === alert.id ? { ...current, status: "resolved" } : current,
      );
    } catch {
      toast.error("Could not resolve alert.");
    } finally {
      setActingAlertId(null);
    }
  };

  if (alertsQuery.isLoading) {
    return <AlertsSkeleton />;
  }

  if (alertsQuery.isError) {
    return <AlertsError onRetry={handleRefresh} isRetrying={alertsQuery.isFetching} />;
  }

  const hasFilters =
    status !== "all" ||
    severity !== "all" ||
    alertType !== "all" ||
    Boolean(schoolId) ||
    Boolean(cameraId) ||
    Boolean(debouncedSearch.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Last updated:{" "}
          {lastUpdated ? formatTimeOnly(lastUpdated) : alertsQuery.isFetching ? "Refreshing…" : "—"}
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={alertsQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${alertsQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {deliveriesQuery.isError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Could not load alert delivery status. Telegram columns may show N/A.
        </p>
      ) : null}

      <AlertsSummaryCards summary={summary} />

      <AlertsFilters
        schools={schoolsQuery.data ?? []}
        status={status}
        severity={severity}
        alertType={alertType}
        schoolId={schoolId}
        cameraId={cameraId}
        search={search}
        onStatusChange={setStatus}
        onSeverityChange={setSeverity}
        onAlertTypeChange={setAlertType}
        onSchoolIdChange={setSchoolId}
        onCameraIdChange={setCameraId}
        onSearchChange={setSearch}
      />

      {filteredAlerts.length === 0 ? (
        <ListEmptyState
          filtered={hasFilters}
          title={hasFilters ? undefined : "No alerts found"}
        />
      ) : (
        <>
          <ListResultsMeta
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            filtered={hasFilters}
          />
          <AlertsTable
            alerts={pagination.paginatedItems}
            deliveriesByAlert={deliveriesByAlert}
            onView={setSelectedAlert}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
            actingAlertId={actingAlertId}
          />
          <ListPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}

      <AlertDetailDrawer
        alert={selectedAlert}
        deliveries={selectedAlert ? (deliveriesByAlert.get(selectedAlert.id) ?? []) : []}
        open={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        isActing={Boolean(actingAlertId)}
      />
    </div>
  );
}

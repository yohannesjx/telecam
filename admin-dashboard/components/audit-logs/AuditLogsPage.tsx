"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { AuditLogDetailDrawer } from "@/components/audit-logs/AuditLogDetailDrawer";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { AuditLogsError } from "@/components/audit-logs/AuditLogsError";
import { AuditLogsFilters } from "@/components/audit-logs/AuditLogsFilters";
import { AuditLogsSkeleton } from "@/components/audit-logs/AuditLogsSkeleton";
import { AuditLogsSummaryCards } from "@/components/audit-logs/AuditLogsSummaryCards";
import { AuditLogsTable } from "@/components/audit-logs/AuditLogsTable";
import { Button } from "@/components/ui/button";
import { enrichAuditLogsWithCameraNames } from "@/lib/admin/audit-logs-normalizer";
import type { NormalizedAuditLog } from "@/lib/admin/audit-logs-types";
import {
  computeAuditLogsSummary,
  filterAuditLogsClientSide,
  PAGE_SIZE,
} from "@/lib/admin/audit-logs-utils";
import { getSchoolCameras } from "@/lib/admin/cameras-api";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  canViewAuditLogs,
  useAuditLogsQuery,
} from "@/lib/admin/use-audit-logs-queries";
import { useSchoolsQuery } from "@/lib/admin/use-camera-monitoring-queries";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AuditLogsPage() {
  const { user } = useAuth();
  const allowed = canViewAuditLogs(user?.role);

  const [schoolId, setSchoolId] = useState("");
  const [userId, setUserId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedLog, setSelectedLog] = useState<NormalizedAuditLog | null>(null);

  const schoolsQuery = useSchoolsQuery();
  const camerasQuery = useQuery({
    queryKey: ["admin", "school-cameras", schoolId],
    queryFn: () => getSchoolCameras(schoolId),
    enabled: allowed && Boolean(schoolId),
  });

  const serverUserId = UUID_RE.test(userId.trim()) ? userId.trim() : undefined;
  const useClientSearch = Boolean(search.trim()) && !serverUserId;
  const fetchLimit = useClientSearch ? 500 : PAGE_SIZE;
  const fetchOffset = useClientSearch ? 0 : page * PAGE_SIZE;

  const auditQuery = useAuditLogsQuery(
    {
      schoolId: schoolId || undefined,
      userId: serverUserId,
      cameraId: cameraId || undefined,
      action: action !== "all" ? action : undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      limit: fetchLimit,
      offset: fetchOffset,
    },
    allowed,
  );

  useEffect(() => {
    if (auditQuery.dataUpdatedAt) {
      setLastUpdated(new Date(auditQuery.dataUpdatedAt));
    }
  }, [auditQuery.dataUpdatedAt]);

  useEffect(() => {
    setPage(0);
  }, [schoolId, userId, cameraId, action, dateFrom, dateTo, search]);

  useEffect(() => {
    setCameraId("");
  }, [schoolId]);

  const cameraNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const camera of camerasQuery.data ?? []) {
      map.set(camera.id, camera.name || camera.id);
    }
    return map;
  }, [camerasQuery.data]);

  const enrichedLogs = useMemo(() => {
    const logs = auditQuery.data?.logs ?? [];
    return enrichAuditLogsWithCameraNames(logs, cameraNameMap);
  }, [auditQuery.data?.logs, cameraNameMap]);

  const filteredLogs = useMemo(() => {
    let logs = enrichedLogs;
    if (search.trim()) {
      logs = filterAuditLogsClientSide(logs, search);
    } else if (userId.trim() && !serverUserId) {
      const q = userId.trim().toLowerCase();
      logs = logs.filter(
        (log) =>
          log.userId?.toLowerCase().includes(q) ||
          log.userName?.toLowerCase().includes(q) ||
          log.userEmail?.toLowerCase().includes(q),
      );
    }
    return [...logs].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
  }, [enrichedLogs, search, userId, serverUserId]);

  const pagedLogs = useMemo(() => {
    if (useClientSearch) {
      const start = page * PAGE_SIZE;
      return filteredLogs.slice(start, start + PAGE_SIZE);
    }
    return filteredLogs;
  }, [filteredLogs, page, useClientSearch]);

  const summary = useMemo(() => computeAuditLogsSummary(filteredLogs), [filteredLogs]);

  const totalCount = useClientSearch
    ? filteredLogs.length
    : (auditQuery.data?.total ?? filteredLogs.length);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const listRange = useMemo(() => {
    if (totalCount === 0) return { start: 0, end: 0 };
    if (useClientSearch) {
      const start = page * PAGE_SIZE;
      return { start: start + 1, end: Math.min(start + PAGE_SIZE, totalCount) };
    }
    const offset = auditQuery.data?.offset ?? 0;
    return { start: offset + 1, end: offset + pagedLogs.length };
  }, [totalCount, useClientSearch, page, auditQuery.data?.offset, pagedLogs.length]);

  const handleRefresh = () => {
    void auditQuery.refetch();
    void schoolsQuery.refetch();
    if (schoolId) void camerasQuery.refetch();
  };

  if (!allowed) {
    return (
      <AuditLogsError message="You do not have permission to view audit logs." />
    );
  }

  if (auditQuery.isLoading && !auditQuery.data) {
    return <AuditLogsSkeleton />;
  }

  if (auditQuery.isError) {
    const err = auditQuery.error;
    if (isForbiddenError(err) || (err instanceof ApiError && err.status === 403)) {
      return <AuditLogsError message={FORBIDDEN_MESSAGE} />;
    }
    return (
      <AuditLogsError
        message="Could not load audit logs."
        onRetry={() => void auditQuery.refetch()}
      />
    );
  }

  const hasFilters =
    Boolean(schoolId || userId || cameraId || action !== "all" || dateFrom || dateTo || search);
  const emptyMessage = hasFilters
    ? "No audit logs match your filters."
    : "No audit logs found.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Last updated:{" "}
          {lastUpdated ? formatTimeOnly(lastUpdated) : auditQuery.isFetching ? "Refreshing…" : "—"}
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={auditQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${auditQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <AuditLogsSummaryCards summary={summary} />

      <AuditLogsFilters
        schools={schoolsQuery.data ?? []}
        cameras={camerasQuery.data ?? []}
        schoolId={schoolId}
        userId={userId}
        cameraId={cameraId}
        action={action}
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={search}
        onSchoolIdChange={setSchoolId}
        onUserIdChange={setUserId}
        onCameraIdChange={setCameraId}
        onActionChange={setAction}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSearchChange={setSearch}
      />

      {auditQuery.isFetching && auditQuery.data ? (
        <p className="text-xs text-muted-foreground">Updating…</p>
      ) : null}

      <AuditLogsTable logs={pagedLogs} onView={setSelectedLog} emptyMessage={emptyMessage} />

      {(totalCount > PAGE_SIZE || page > 0) && pagedLogs.length > 0 ? (
        <>
          <ListResultsMeta
            total={totalCount}
            rangeStart={listRange.start}
            rangeEnd={listRange.end}
            filtered={Boolean(search.trim()) || hasFilters}
          />
          <ListPagination
            page={page}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            total={totalCount}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <AuditLogDetailDrawer
        log={selectedLog}
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

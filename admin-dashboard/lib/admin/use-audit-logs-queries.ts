"use client";

import { useQuery } from "@tanstack/react-query";

import { getAuditLogsPage } from "@/lib/admin/audit-logs-api";
import type { AuditLogFilters } from "@/lib/admin/audit-logs-types";
import type { UserRole } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";

export const AUDIT_LOGS_QUERY_KEY = ["admin", "audit-logs"] as const;
export const AUDIT_LOGS_REFETCH_MS = 60_000;

export function canViewAuditLogs(role: UserRole | undefined): boolean {
  return hasPermission(role, "auditLogs:view");
}

export function useAuditLogsQuery(
  params?: AuditLogFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [...AUDIT_LOGS_QUERY_KEY, params ?? {}],
    queryFn: () => getAuditLogsPage(params),
    enabled,
    refetchInterval: AUDIT_LOGS_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: (count, err) => {
      if (typeof err === "object" && err && "status" in err && (err as { status: number }).status === 403) {
        return false;
      }
      return count < 1;
    },
  });
}

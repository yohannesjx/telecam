"use client";

import { useQuery } from "@tanstack/react-query";

import { getAdminDashboard } from "@/lib/admin/dashboard-api";

export const DASHBOARD_QUERY_KEY = ["admin", "dashboard"] as const;
export const DASHBOARD_REFETCH_MS = 45_000;

export function useDashboardQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: getAdminDashboard,
    refetchInterval: DASHBOARD_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

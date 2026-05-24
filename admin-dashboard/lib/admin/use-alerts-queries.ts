"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acknowledgeAlert,
  getAlertDeliveries,
  getAlerts,
  resolveAlert,
} from "@/lib/admin/alerts-api";
import type { AlertFilters } from "@/lib/admin/alerts-types";

export const ALERTS_QUERY_KEY = ["admin", "alerts"] as const;
export const ALERT_DELIVERIES_QUERY_KEY = ["admin", "alert-deliveries"] as const;
export const ALERTS_REFETCH_MS = 20_000;

export function useAlertsQuery(params?: AlertFilters) {
  return useQuery({
    queryKey: [...ALERTS_QUERY_KEY, params ?? {}],
    queryFn: () => getAlerts(params),
    refetchInterval: ALERTS_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useAlertDeliveriesQuery(enabled = true) {
  return useQuery({
    queryKey: ALERT_DELIVERIES_QUERY_KEY,
    queryFn: getAlertDeliveries,
    enabled,
    refetchInterval: ALERTS_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useAcknowledgeAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

export function useResolveAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveAlert,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

import { ApiError, apiFetch } from "@/lib/api";
import {
  normalizeAlert,
  normalizeAlertDeliveries,
  normalizeAlertsList,
} from "@/lib/admin/alerts-normalizer";
import type {
  AlertFilters,
  AlertsListResult,
  NormalizedAlert,
  NormalizedAlertDelivery,
} from "@/lib/admin/alerts-types";

function buildAlertsQuery(params?: AlertFilters): string {
  const query = new URLSearchParams();
  const limit = params?.limit ?? 500;
  query.set("limit", String(limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  if (params?.status && params.status !== "all") {
    query.set("status", params.status.toUpperCase());
  }
  if (params?.severity && params.severity !== "all") {
    query.set("severity", params.severity.toUpperCase());
  }
  if (params?.alertType && params.alertType !== "all") {
    query.set("alert_type", params.alertType);
  }
  if (params?.schoolId) query.set("school_id", params.schoolId);
  if (params?.cameraId) query.set("camera_id", params.cameraId);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function getAlerts(params?: AlertFilters): Promise<AlertsListResult> {
  const raw = await apiFetch<unknown>(`/admin/alerts${buildAlertsQuery(params)}`, {
    method: "GET",
  });
  return normalizeAlertsList(raw);
}

export async function acknowledgeAlert(alertId: string): Promise<NormalizedAlert> {
  const raw = await apiFetch<unknown>(
    `/admin/alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { method: "PATCH" },
  );
  const payload =
    typeof raw === "object" && raw !== null && "data" in raw
      ? (raw as { data: unknown }).data
      : raw;
  return normalizeAlert(payload);
}

export async function resolveAlert(alertId: string): Promise<NormalizedAlert> {
  const raw = await apiFetch<unknown>(
    `/admin/alerts/${encodeURIComponent(alertId)}/resolve`,
    { method: "PATCH" },
  );
  const payload =
    typeof raw === "object" && raw !== null && "data" in raw
      ? (raw as { data: unknown }).data
      : raw;
  return normalizeAlert(payload);
}

export async function getAlertDeliveries(): Promise<NormalizedAlertDelivery[]> {
  try {
    const raw = await apiFetch<unknown>("/admin/alert-deliveries", { method: "GET" });
    return normalizeAlertDeliveries(raw);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return [];
    }
    throw err;
  }
}

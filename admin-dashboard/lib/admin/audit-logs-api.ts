import { apiFetch } from "@/lib/api";
import {
  enrichAuditLogsWithCameraNames,
  normalizeAuditLogsPage,
} from "@/lib/admin/audit-logs-normalizer";
import type { AuditLogFilters, AuditLogsPage } from "@/lib/admin/audit-logs-types";
import { PAGE_SIZE } from "@/lib/admin/audit-logs-utils";

function buildAuditLogsQuery(params?: AuditLogFilters): string {
  const query = new URLSearchParams();
  const limit = params?.limit ?? PAGE_SIZE;
  const offset = params?.offset ?? 0;
  query.set("limit", String(limit));
  query.set("offset", String(offset));
  if (params?.schoolId) query.set("school_id", params.schoolId);
  if (params?.userId) query.set("user_id", params.userId);
  if (params?.cameraId) query.set("camera_id", params.cameraId);
  if (params?.action && params.action !== "all") query.set("action", params.action);
  if (params?.from) query.set("date_from", params.from);
  if (params?.to) query.set("date_to", params.to);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function getAuditLogsPage(params?: AuditLogFilters): Promise<AuditLogsPage> {
  const raw = await apiFetch<unknown>(`/admin/audit-logs${buildAuditLogsQuery(params)}`, {
    method: "GET",
  });
  return normalizeAuditLogsPage(raw);
}

export async function getAuditLogs(
  params?: AuditLogFilters,
  cameraNames?: Map<string, string>,
): Promise<AuditLogsPage["logs"]> {
  const page = await getAuditLogsPage(params);
  if (!cameraNames || cameraNames.size === 0) return page.logs;
  return enrichAuditLogsWithCameraNames(page.logs, cameraNames);
}

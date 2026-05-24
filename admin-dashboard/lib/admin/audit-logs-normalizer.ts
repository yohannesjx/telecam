import {
  categorizeAuditAction,
  extractRequestId,
  sanitizeMetadataRecord,
} from "@/lib/admin/audit-logs-utils";
import type { AuditLogsPage, NormalizedAuditLog } from "@/lib/admin/audit-logs-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

export function normalizeAuditLog(
  raw: unknown,
  cameraNames?: Map<string, string>,
): NormalizedAuditLog {
  const row = isRecord(raw) ? raw : {};
  const action = str(pick(row, ["action"])) ?? "UNKNOWN";
  const metadataRaw = pick(row, ["metadata"]);
  const metadata =
    metadataRaw && typeof metadataRaw === "object"
      ? sanitizeMetadataRecord(metadataRaw as Record<string, unknown>)
      : null;
  const cameraId = str(pick(row, ["camera_id", "cameraId"])) ?? null;

  return {
    id: str(pick(row, ["id"])) ?? "",
    action,
    category: categorizeAuditAction(action),
    userId: str(pick(row, ["user_id", "userId"])) ?? null,
    userName: str(pick(row, ["user_name", "userName", "full_name"])) ?? null,
    userEmail: str(pick(row, ["user_email", "userEmail", "email"])) ?? null,
    userRole: str(pick(row, ["user_role", "userRole", "role"])) ?? null,
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    cameraId,
    cameraName: cameraId ? cameraNames?.get(cameraId) ?? null : null,
    ipAddress: str(pick(row, ["ip_address", "ipAddress"])) ?? null,
    userAgent: str(pick(row, ["user_agent", "userAgent"])) ?? null,
    requestId: extractRequestId(metadata),
    metadata,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
  };
}

export function normalizeAuditLogs(raw: unknown): NormalizedAuditLog[] {
  const page = normalizeAuditLogsPage(raw);
  return page.logs;
}

export function normalizeAuditLogsPage(raw: unknown): AuditLogsPage {
  const root = isRecord(raw) ? raw : {};
  const payload = isRecord(root.data) ? root.data : root;

  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["audit_logs", "auditLogs", "logs", "data", "items"])
      : [];

  const paginationSource = isRecord(root.pagination)
    ? root.pagination
    : isRecord(payload) && isRecord(payload.pagination)
      ? payload.pagination
      : null;

  const logs = Array.isArray(rows)
    ? rows.filter(isRecord).map((row) => normalizeAuditLog(row))
    : [];

  const limit =
    paginationSource && typeof paginationSource.limit === "number"
      ? paginationSource.limit
      : logs.length;
  const offset =
    paginationSource && typeof paginationSource.offset === "number"
      ? paginationSource.offset
      : 0;
  const total =
    paginationSource && typeof paginationSource.total === "number"
      ? paginationSource.total
      : logs.length;

  return { logs, limit, offset, total };
}

export function enrichAuditLogsWithCameraNames(
  logs: NormalizedAuditLog[],
  cameraNames: Map<string, string>,
): NormalizedAuditLog[] {
  return logs.map((log) => ({
    ...log,
    cameraName: log.cameraId ? cameraNames.get(log.cameraId) ?? log.cameraName : log.cameraName,
  }));
}

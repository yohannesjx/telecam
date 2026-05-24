import type { AuditLogCategory, AuditLogsSummary, NormalizedAuditLog } from "@/lib/admin/audit-logs-types";

const SENSITIVE_KEY_PARTS = [
  "token",
  "secret",
  "password",
  "authorization",
  "cookie",
  "rtsp",
  "signed",
  "url",
  "credential",
  "access_token",
  "refresh_token",
  "jwt",
  "key",
  "hash",
  "proof_url",
  "playlist",
  "segment_path",
];

const MASK = "••••••••";

export function isSensitiveMetadataKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
}

function maskStringValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("rtsp")) return MASK;
  if (trimmed.length > 80 && /[A-Za-z0-9+/=_-]{40,}/.test(trimmed)) return MASK;
  return MASK;
}

export function sanitizeMetadataValue(key: string, value: unknown): unknown {
  if (isSensitiveMetadataKey(key)) {
    if (value === null || value === undefined) return null;
    return MASK;
  }
  if (typeof value === "string") {
    if (isSensitiveMetadataKey(key)) return MASK;
    if (/token|secret|password|jwt|bearer/i.test(value) && value.length > 12) return MASK;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeMetadataValue(`${key}[${index}]`, item));
  }
  if (typeof value === "object" && value !== null) {
    return sanitizeMetadataRecord(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizeMetadataRecord(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveMetadataKey(key)) {
      out[key] = MASK;
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = sanitizeMetadataRecord(value as Record<string, unknown>);
      if (nested && Object.keys(nested).length > 0) out[key] = nested;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item, index) => sanitizeMetadataValue(`${key}[${index}]`, item));
      continue;
    }
    if (typeof value === "string" && isSensitiveMetadataKey(key)) {
      out[key] = maskStringValue(value);
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function categorizeAuditAction(action: string): AuditLogCategory {
  const a = action.toUpperCase();
  if (a.startsWith("AUTH_")) return "auth";
  if (a.startsWith("PLAYBACK_")) return "playback";
  if (
    a.startsWith("SUBSCRIPTION_") ||
    a.startsWith("PAYMENT_") ||
    a.startsWith("INVOICE_") ||
    a.startsWith("REVENUE_")
  ) {
    return "billing";
  }
  if (a.startsWith("ALERT_")) return "alert";
  if (a.startsWith("CAMERA_")) return "camera";
  if (a.startsWith("SCHOOL_")) return "school";
  if (
    a.startsWith("ADMIN_") ||
    a.startsWith("CLASSROOM_") ||
    a.startsWith("CHILD_") ||
    a.startsWith("PARENT_")
  ) {
    return "admin";
  }
  if (a.includes("WORKER") || a.includes("SYSTEM")) return "system";
  return "other";
}

export function extractRequestId(metadata?: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const keys = ["request_id", "requestId", "correlation_id", "trace_id"];
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function computeAuditLogsSummary(logs: NormalizedAuditLog[]): AuditLogsSummary {
  let loginFailures = 0;
  let playbackDenials = 0;
  let adminActions = 0;
  let billingActions = 0;
  let alertActions = 0;

  for (const log of logs) {
    const action = log.action.toUpperCase();
    if (action === "AUTH_LOGIN_FAILED" || action.includes("LOGIN_FAILED")) loginFailures += 1;
    if (action === "PLAYBACK_ACCESS_DENIED" || action.includes("ACCESS_DENIED")) playbackDenials += 1;
    if (log.category === "admin" || log.category === "school" || log.category === "camera") {
      adminActions += 1;
    }
    if (log.category === "billing") billingActions += 1;
    if (log.category === "alert") alertActions += 1;
  }

  return {
    total: logs.length,
    loginFailures,
    playbackDenials,
    adminActions,
    billingActions,
    alertActions,
  };
}

export const AUDIT_ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "AUTH_LOGIN_SUCCESS", label: "AUTH_LOGIN_SUCCESS" },
  { value: "AUTH_LOGIN_FAILED", label: "AUTH_LOGIN_FAILED" },
  { value: "AUTH_LOGOUT", label: "AUTH_LOGOUT" },
  { value: "AUTH_TOKEN_REFRESH", label: "AUTH_TOKEN_REFRESH" },
  { value: "PLAYBACK_LIVE_REQUESTED", label: "PLAYBACK_LIVE_REQUESTED" },
  { value: "PLAYBACK_TIMELINE_REQUESTED", label: "PLAYBACK_TIMELINE_REQUESTED" },
  { value: "PLAYBACK_RECORDING_REQUESTED", label: "PLAYBACK_RECORDING_REQUESTED" },
  { value: "PLAYBACK_ACCESS_DENIED", label: "PLAYBACK_ACCESS_DENIED" },
  { value: "SCHOOL_CREATED", label: "SCHOOL_CREATED" },
  { value: "SCHOOL_UPDATED", label: "SCHOOL_UPDATED" },
  { value: "CLASSROOM_CREATED", label: "CLASSROOM_CREATED" },
  { value: "CLASSROOM_UPDATED", label: "CLASSROOM_UPDATED" },
  { value: "CHILD_CREATED", label: "CHILD_CREATED" },
  { value: "CHILD_UPDATED", label: "CHILD_UPDATED" },
  { value: "PARENT_CREATED", label: "PARENT_CREATED" },
  { value: "PARENT_ASSIGNED_TO_CHILD", label: "PARENT_ASSIGNED_TO_CHILD" },
  { value: "CAMERA_CREATED", label: "CAMERA_CREATED" },
  { value: "CAMERA_UPDATED", label: "CAMERA_UPDATED" },
  { value: "ALERT_ACKNOWLEDGED", label: "ALERT_ACKNOWLEDGED" },
  { value: "ALERT_RESOLVED", label: "ALERT_RESOLVED" },
  { value: "SUBSCRIPTION_CREATED", label: "SUBSCRIPTION_CREATED" },
  { value: "SUBSCRIPTION_STATUS_UPDATED", label: "SUBSCRIPTION_STATUS_UPDATED" },
  { value: "SUBSCRIPTION_EXTENDED", label: "SUBSCRIPTION_EXTENDED" },
  { value: "PAYMENT_CREATED", label: "PAYMENT_CREATED" },
  { value: "PAYMENT_APPROVED", label: "PAYMENT_APPROVED" },
  { value: "PAYMENT_REJECTED", label: "PAYMENT_REJECTED" },
  { value: "INVOICE_CREATED", label: "INVOICE_CREATED" },
  { value: "INVOICE_MARKED_PAID", label: "INVOICE_MARKED_PAID" },
  { value: "INVOICE_VOIDED", label: "INVOICE_VOIDED" },
] as const;

export const PAGE_SIZE = 50;

export function filterAuditLogsClientSide(
  logs: NormalizedAuditLog[],
  search: string,
): NormalizedAuditLog[] {
  const q = search.trim().toLowerCase();
  if (!q) return logs;
  return logs.filter((log) => {
    const metaText = log.metadata ? JSON.stringify(log.metadata).toLowerCase() : "";
    const haystack = [
      log.action,
      log.userName,
      log.userEmail,
      log.userId,
      log.schoolName,
      log.schoolId,
      log.cameraName,
      log.cameraId,
      log.ipAddress,
      log.userAgent,
      metaText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

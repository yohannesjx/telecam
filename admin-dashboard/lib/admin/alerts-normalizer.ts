import type {
  AlertSeverity,
  AlertsListResult,
  AlertsSummary,
  AlertStatus,
  DeliveryDisplayStatus,
  NormalizedAlert,
  NormalizedAlertDelivery,
} from "@/lib/admin/alerts-types";

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|key|rtsp|url|signed|credential|authorization|chat_id|recipient/i;

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

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeSeverity(value: unknown): AlertSeverity {
  const s = String(value ?? "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "warning") return "warning";
  if (s === "info") return "info";
  return "unknown";
}

function normalizeStatus(value: unknown): AlertStatus {
  const s = String(value ?? "").toLowerCase();
  if (s === "open") return "open";
  if (s === "acknowledged") return "acknowledged";
  if (s === "resolved") return "resolved";
  return "unknown";
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!isRecord(raw)) return null;
  return sanitizeMetadata(raw);
}

export function sanitizeMetadata(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = "••••••••";
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      out[key] = sanitizeMetadata(value as Record<string, unknown>);
      continue;
    }
    if (typeof value === "string") {
      if (SENSITIVE_KEY_PATTERN.test(key) || /^rtsp:/i.test(value) || /^https?:\/\/.+\?.*sig=/i.test(value)) {
        out[key] = "••••••••";
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

function maskRecipient(channel: string | null | undefined, recipient: string | null | undefined) {
  if (!recipient) return recipient ?? null;
  if ((channel ?? "").toLowerCase().includes("telegram")) {
    return "••••••••";
  }
  return recipient;
}

export function normalizeAlert(raw: unknown): NormalizedAlert {
  const row = isRecord(raw) ? raw : {};
  const status = normalizeStatus(pick(row, ["status"]));
  const title = str(pick(row, ["title"])) ?? "";
  const message =
    str(pick(row, ["message"])) ?? title ?? "No message";
  const updatedAt = str(pick(row, ["updated_at", "updatedAt"])) ?? null;
  const resolvedAt = str(pick(row, ["resolved_at", "resolvedAt"])) ?? null;
  const metadata = parseMetadata(pick(row, ["metadata"]));

  return {
    id: str(pick(row, ["id"])) ?? "",
    type: str(pick(row, ["alert_type", "alertType", "type"])) ?? "UNKNOWN",
    severity: normalizeSeverity(pick(row, ["severity"])),
    status,
    title,
    message,
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    cameraId: str(pick(row, ["camera_id", "cameraId"])) ?? null,
    cameraName: str(pick(row, ["camera_name", "cameraName"])) ?? null,
    createdAt: str(pick(row, ["opened_at", "openedAt", "created_at", "createdAt"])) ?? null,
    updatedAt,
    acknowledgedAt: status === "acknowledged" ? updatedAt : null,
    resolvedAt,
    metadata,
  };
}

export function normalizeAlertsList(raw: unknown): AlertsListResult {
  if (Array.isArray(raw)) {
    return {
      alerts: raw.map(normalizeAlert),
      total: raw.length,
      limit: raw.length,
      offset: 0,
    };
  }

  const root = isRecord(raw) ? raw : {};
  const payload = isRecord(root.data) ? root.data : root;
  const alertsRaw = Array.isArray(payload)
    ? payload
    : pick(payload, ["alerts", "data", "items"]);
  const alerts = Array.isArray(alertsRaw) ? alertsRaw.map(normalizeAlert) : [];

  const pagination = isRecord(root.pagination)
    ? root.pagination
    : isRecord(payload.pagination)
      ? payload.pagination
      : null;

  return {
    alerts,
    total: num(pagination ? pick(pagination, ["total"]) : alerts.length),
    limit: num(pagination ? pick(pagination, ["limit"]) : alerts.length) || alerts.length,
    offset: num(pagination ? pick(pagination, ["offset"]) : 0),
  };
}

export function normalizeAlertDelivery(raw: unknown): NormalizedAlertDelivery {
  const row = isRecord(raw) ? raw : {};
  const channel = str(pick(row, ["channel"])) ?? null;
  const recipient = str(pick(row, ["recipient"])) ?? null;

  return {
    id: str(pick(row, ["id"])),
    alertId: str(pick(row, ["alert_id", "alertId"])) ?? "",
    channel,
    recipient: maskRecipient(channel, recipient),
    status: str(pick(row, ["status"])) ?? null,
    deliveryKind: str(pick(row, ["delivery_kind", "deliveryKind"])) ?? null,
    attemptCount: num(pick(row, ["attempts", "attempt_count", "attemptCount"])) || null,
    lastError: str(pick(row, ["last_error", "lastError"])) ?? null,
    sentAt: str(pick(row, ["delivered_at", "deliveredAt", "sent_at", "sentAt"])) ?? null,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
  };
}

export function normalizeAlertDeliveries(raw: unknown): NormalizedAlertDelivery[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["deliveries", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeAlertDelivery).filter((d) => d.alertId);
}

export function computeAlertsSummary(
  alerts: NormalizedAlert[],
  deliveries: NormalizedAlertDelivery[],
): AlertsSummary {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  let open = 0;
  let critical = 0;
  let warning = 0;
  let acknowledged = 0;
  let resolvedToday = 0;

  for (const alert of alerts) {
    if (alert.status === "open") open += 1;
    if (alert.status === "acknowledged") acknowledged += 1;
    if (alert.severity === "critical" && alert.status !== "resolved") critical += 1;
    if (alert.severity === "warning" && alert.status !== "resolved") warning += 1;
    if (alert.resolvedAt?.startsWith(todayKey)) resolvedToday += 1;
  }

  const telegramFailures = deliveries.filter((d) => {
    const status = (d.status ?? "").toUpperCase();
    return status === "FAILED" || status === "ERROR";
  }).length;

  return { open, critical, warning, acknowledged, resolvedToday, telegramFailures };
}

export function mapDeliveryDisplayStatus(status: string | null | undefined): DeliveryDisplayStatus {
  const s = (status ?? "").toUpperCase();
  if (s === "SENT" || s === "DELIVERED" || s === "SUCCESS") return "sent";
  if (s === "PENDING" || s === "QUEUED" || s === "RETRY") return "pending";
  if (s === "FAILED" || s === "ERROR") return "failed";
  if (!status) return "na";
  return "not_sent";
}

export function summarizeDeliveriesForAlert(
  deliveries: NormalizedAlertDelivery[],
): string {
  if (deliveries.length === 0) return "N/A";

  const parts = deliveries.map((d) => {
    const channel = (d.channel ?? "Delivery").replace(/^./, (c) => c.toUpperCase());
    const display = mapDeliveryDisplayStatus(d.status);
    if (display === "sent") return `${channel}: sent`;
    if (display === "pending") return `${channel}: pending`;
    if (display === "failed") return `${channel}: failed`;
    return `${channel}: ${display}`;
  });

  return parts.join(" · ");
}

export function filterAlertsClientSide(
  alerts: NormalizedAlert[],
  filters: {
    status?: string;
    severity?: string;
    alertType?: string;
    schoolId?: string;
    cameraId?: string;
    search?: string;
  },
): NormalizedAlert[] {
  const search = filters.search?.trim().toLowerCase() ?? "";

  return alerts.filter((alert) => {
    if (filters.status && filters.status !== "all") {
      if (alert.status !== filters.status.toLowerCase()) return false;
    }
    if (filters.severity && filters.severity !== "all") {
      if (alert.severity !== filters.severity.toLowerCase()) return false;
    }
    if (filters.alertType && filters.alertType !== "all") {
      if (alert.type !== filters.alertType) return false;
    }
    if (filters.schoolId && alert.schoolId !== filters.schoolId) return false;
    if (filters.cameraId && alert.cameraId !== filters.cameraId) return false;
    if (search) {
      const haystack = [
        alert.message,
        alert.title,
        alert.type,
        alert.schoolName,
        alert.cameraName,
        alert.schoolId,
        alert.cameraId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function enrichAlertsWithSchoolNames(
  alerts: NormalizedAlert[],
  schools: { id: string; name: string }[],
): NormalizedAlert[] {
  const map = new Map(schools.map((s) => [s.id, s.name]));
  return alerts.map((alert) => ({
    ...alert,
    schoolName: alert.schoolName ?? (alert.schoolId ? map.get(alert.schoolId) ?? null : null),
  }));
}

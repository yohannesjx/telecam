export type AlertSeverity = "critical" | "warning" | "info" | "unknown";
export type AlertStatus = "open" | "acknowledged" | "resolved" | "unknown";

export type AlertFilters = {
  status?: string;
  severity?: string;
  alertType?: string;
  schoolId?: string;
  cameraId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type NormalizedAlert = {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  schoolId?: string | null;
  schoolName?: string | null;
  cameraId?: string | null;
  cameraName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type NormalizedAlertDelivery = {
  id?: string;
  alertId: string;
  channel?: string | null;
  recipient?: string | null;
  status?: string | null;
  deliveryKind?: string | null;
  attemptCount?: number | null;
  lastError?: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
};

export type AlertsListResult = {
  alerts: NormalizedAlert[];
  total: number;
  limit: number;
  offset: number;
};

export type AlertsSummary = {
  open: number;
  critical: number;
  warning: number;
  acknowledged: number;
  resolvedToday: number;
  telegramFailures: number;
};

export type AlertStatusFilter = "all" | "open" | "acknowledged" | "resolved";
export type AlertSeverityFilter = "all" | "critical" | "warning" | "info";

export type DeliveryDisplayStatus = "sent" | "pending" | "failed" | "not_sent" | "na";

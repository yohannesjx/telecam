export type AuditLogCategory =
  | "auth"
  | "playback"
  | "admin"
  | "camera"
  | "school"
  | "billing"
  | "alert"
  | "system"
  | "other";

export type NormalizedAuditLog = {
  id: string;
  action: string;
  category: AuditLogCategory;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  schoolId?: string | null;
  schoolName?: string | null;
  cameraId?: string | null;
  cameraName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export type AuditLogFilters = {
  schoolId?: string;
  userId?: string;
  cameraId?: string;
  action?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type AuditLogsPage = {
  logs: NormalizedAuditLog[];
  limit: number;
  offset: number;
  total: number;
};

export type AuditLogsSummary = {
  total: number;
  loginFailures: number;
  playbackDenials: number;
  adminActions: number;
  billingActions: number;
  alertActions: number;
};

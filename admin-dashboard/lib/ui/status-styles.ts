export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

export const statusToneClasses: Record<StatusTone, string> = {
  success:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 border-emerald-200/60",
  warning:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 border-amber-200/60",
  danger:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 border-red-200/60",
  info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20 border-sky-200/60",
  muted:
    "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/15 border-slate-200/60",
};

const SUCCESS_STATUSES = new Set([
  "healthy",
  "online",
  "active",
  "good",
  "running",
  "paid",
  "completed",
  "success",
  "enabled",
]);

const WARNING_STATUSES = new Set([
  "warning",
  "stopped",
  "pending",
  "stale",
  "trial",
  "no_recent_segment",
  "stopped_by_schedule",
]);

const DANGER_STATUSES = new Set([
  "critical",
  "offline",
  "failed",
  "error",
  "overdue",
  "cancelled",
  "canceled",
  "declined",
]);

const INFO_STATUSES = new Set([
  "info",
  "running",
  "processing",
  "scheduled",
  "open",
  "draft",
]);

export function resolveStatusTone(status: string): StatusTone {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");

  if (SUCCESS_STATUSES.has(normalized)) return "success";
  if (WARNING_STATUSES.has(normalized)) return "warning";
  if (DANGER_STATUSES.has(normalized)) return "danger";
  if (INFO_STATUSES.has(normalized)) return "info";
  return "muted";
}

export function statusToneClassFor(status: string): string {
  return statusToneClasses[resolveStatusTone(status)];
}

export function healthLevelTone(
  level: "good" | "warning" | "critical",
): StatusTone {
  switch (level) {
    case "good":
      return "success";
    case "warning":
      return "warning";
    case "critical":
      return "danger";
  }
}

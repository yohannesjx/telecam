import type { HealthLevel } from "@/lib/admin/dashboard-types";
import {
  healthLevelTone,
  resolveStatusTone,
  statusToneClasses,
} from "@/lib/ui/status-styles";

export function formatNumber(value: number | null | undefined, fallback = "0"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(
  value: number | null | undefined,
  fallback = "N/A",
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return `${Math.round(value * 10) / 10}%`;
}

export function formatCurrencyEtb(
  amount: number | null | undefined,
  fallback = "ETB 0",
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return fallback;
  return `ETB ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

/** Format storage from GB or bytes. */
export function formatStorage(gb: number | null, bytes: number | null): string {
  if (gb !== null && gb > 0) {
    if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
    return `${gb.toFixed(2)} GB`;
  }
  if (bytes !== null && bytes > 0) {
    const gbFromBytes = bytes / 1024 ** 3;
    if (gbFromBytes >= 1024) return `${(gbFromBytes / 1024).toFixed(2)} TB`;
    if (gbFromBytes >= 1) return `${gbFromBytes.toFixed(2)} GB`;
    const mb = bytes / 1024 ** 2;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return "N/A";
}

export function formatDateTime(
  iso: string | null | undefined,
  fallback = "N/A",
): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatTimeOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatRelativeTime(
  iso: string | null | undefined,
  fallback = "N/A",
): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatDuration(
  seconds: number | null | undefined,
  fallback = "N/A",
): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return fallback;
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  if (minutes < 60) return rem > 0 ? `${minutes}m ${rem}s` : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours} hours`;
}

export function formatBytes(
  bytes: number | null | undefined,
  fallback = "N/A",
): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes <= 0) {
    return fallback;
  }
  return formatStorage(null, bytes);
}

export function formatMoneyUsd(
  amount: number | null | undefined,
  fallback = "N/A",
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return fallback;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function healthLevelBadgeClass(level: HealthLevel): string {
  return statusToneClasses[healthLevelTone(level)];
}

export function workerStatusBadgeClass(status: string): string {
  return statusToneClasses[resolveStatusTone(status)];
}

export function cameraOperationalStatusLabel(
  status: import("@/lib/admin/camera-monitoring-types").CameraOperationalStatus,
): string {
  switch (status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    case "stopped_by_schedule":
      return "Stopped by schedule";
    case "no_recent_segment":
      return "No recent segment";
    case "error":
      return "Error";
    case "disabled":
      return "Disabled";
    default:
      return "Unknown";
  }
}

export function cameraOperationalStatusBadgeClass(
  status: import("@/lib/admin/camera-monitoring-types").CameraOperationalStatus,
): string {
  return statusToneClasses[resolveStatusTone(status)];
}

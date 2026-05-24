import type {
  AdminDashboardResponse,
  NormalizedDashboard,
} from "@/lib/admin/dashboard-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function optionalNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = num(value);
  return Number.isFinite(n) ? n : null;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function unwrapPayload(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {};
  if ("data" in raw && isRecord(raw.data)) return raw.data;
  return raw;
}

const WORKER_KEYS = [
  { key: "stream_worker_status", name: "Stream Worker" },
  { key: "health_worker_status", name: "Health Worker" },
  { key: "alert_worker_status", name: "Alert Worker" },
  { key: "scheduler_worker_status", name: "Scheduler Worker" },
  { key: "retention_worker_status", name: "Retention Worker" },
] as const;

function extractWorkerStatuses(flat: Record<string, unknown>) {
  const workersNested = isRecord(flat.workers) ? flat.workers : null;
  const statuses = WORKER_KEYS.map(({ key, name }) => ({
    name,
    status: String(
      pick(flat, [key]) ??
        (workersNested ? pick(workersNested, [key.replace("_worker_status", "")]) : undefined) ??
        "UNKNOWN",
    ).toUpperCase(),
  }));

  let healthy = 0;
  let stale = 0;
  for (const w of statuses) {
    if (w.status === "RUNNING" || w.status === "HEALTHY") healthy += 1;
    if (w.status === "STALE") stale += 1;
  }

  if (workersNested) {
    const nestedHealthy = optionalNum(workersNested.healthy);
    const nestedTotal = optionalNum(workersNested.total);
    const nestedStale = optionalNum(workersNested.stale);
    if (nestedHealthy !== null) healthy = nestedHealthy;
    if (nestedTotal !== null) {
      return {
        statuses,
        healthy,
        total: nestedTotal,
        stale: nestedStale ?? stale,
      };
    }
    if (nestedStale !== null) stale = nestedStale;
  }

  return { statuses, healthy, total: statuses.length, stale };
}

export function normalizeDashboardData(raw: unknown): NormalizedDashboard {
  const flat = unwrapPayload(raw);

  const schools = isRecord(flat.schools) ? flat.schools : flat;
  const parents = isRecord(flat.parents) ? flat.parents : flat;
  const children = isRecord(flat.children) ? flat.children : flat;
  const cameras = isRecord(flat.cameras) ? flat.cameras : flat;
  const alerts = isRecord(flat.alerts) ? flat.alerts : flat;
  const subscriptions = isRecord(flat.subscriptions) ? flat.subscriptions : flat;
  const billing = isRecord(flat.billing) ? flat.billing : flat;
  const playback = isRecord(flat.playback) ? flat.playback : flat;
  const auth = isRecord(flat.auth) ? flat.auth : flat;
  const storage = isRecord(flat.storage) ? flat.storage : flat;

  const camerasTotal = num(pick(cameras, ["total", "cameras_total"]));
  const camerasActive = num(pick(cameras, ["active", "cameras_active"]));
  const camerasOffline = num(pick(cameras, ["offline", "cameras_offline"]));
  const camerasHealthy = num(
    pick(cameras, ["healthy", "cameras_healthy", "online", "cameras_online"]),
  );

  const healthyDenominator =
    camerasActive > 0 ? camerasActive : camerasTotal > 0 ? camerasTotal : 0;
  const healthyNumerator =
    camerasHealthy > 0
      ? camerasHealthy
      : camerasActive > 0
        ? Math.max(camerasActive - camerasOffline, 0)
        : 0;

  const camerasHealthyPercent =
    healthyDenominator > 0
      ? Math.round((healthyNumerator / healthyDenominator) * 1000) / 10
      : null;

  const openAlerts = num(pick(alerts, ["open", "open_alerts"]));
  const criticalAlerts = num(pick(alerts, ["critical", "critical_alerts"]));
  const warningFromApi = pick(alerts, ["warning", "warning_alerts"]);
  const warningAlerts =
    warningFromApi !== undefined
      ? num(warningFromApi)
      : Math.max(openAlerts - criticalAlerts, 0);

  const revenueCents = optionalNum(
    pick(billing, ["monthly_revenue_cents", "monthlyRevenueCents"]),
  );
  const revenueEtbDirect = optionalNum(
    pick(flat, ["monthly_revenue_etb", "monthlyRevenueEtb"]) ??
      pick(billing, ["monthly_revenue_etb", "monthlyRevenueEtb"]),
  );
  const monthlyRevenueEtb =
    revenueEtbDirect ?? (revenueCents !== null ? revenueCents / 100 : 0);

  const pendingCents = optionalNum(
    pick(billing, ["pending_payments_cents", "pendingPaymentsCents"]),
  );
  const pendingEtbDirect = optionalNum(
    pick(flat, ["pending_payments_etb", "pendingPaymentsEtb"]) ??
      pick(billing, ["pending_payments_etb", "pendingPaymentsEtb", "pending_payments"]),
  );
  const pendingPaymentsEtb =
    pendingEtbDirect ?? (pendingCents !== null ? pendingCents / 100 : 0);

  const storageGb =
    optionalNum(pick(storage, ["total_gb", "storage_total_gb"]) ?? pick(flat, ["storage_total_gb"])) ??
    null;
  const storageBytes =
    optionalNum(pick(storage, ["total_bytes", "storage_total_bytes"])) ?? null;

  const workers = extractWorkerStatuses(flat);

  return {
    schoolsTotal: num(pick(schools, ["total", "schools_total"])),
    schoolsActive: num(pick(schools, ["active", "schools_active"])),
    parentsTotal: num(pick(parents, ["total", "parents_total"])),
    parentsActive: num(pick(parents, ["active", "parents_active"])),
    childrenTotal: num(pick(children, ["total", "children_total"])),
    camerasTotal,
    camerasActive,
    camerasOffline,
    camerasHealthy: healthyNumerator,
    camerasHealthyPercent,
    openAlerts,
    criticalAlerts,
    warningAlerts,
    subscriptionsActive: num(
      pick(subscriptions, ["active", "subscriptions_active"]),
    ),
    subscriptionsTrial: num(pick(subscriptions, ["trial", "subscriptions_trial"])),
    monthlyRevenueEtb,
    pendingPaymentsEtb,
    playbackRequestsToday: num(
      pick(playback, ["requests_today", "playback_requests_today"]),
    ),
    playbackDeniedToday: num(
      pick(playback, ["denied_today", "playback_denied_today"]),
    ),
    loginFailuresToday: num(
      pick(auth, ["login_failures_today", "loginFailuresToday"]),
    ),
    storageGb,
    storageBytes,
    workersHealthy: workers.healthy,
    workersTotal: workers.total,
    workersStale: workers.stale,
    workerStatuses: workers.statuses,
    backendHealthScorePercent: optionalNum(
      pick(flat, ["system_health_score_percent", "systemHealthScorePercent"]),
    ),
    cached: Boolean(flat.cached),
  };
}

/** Type guard helper for nested API docs shape */
export type { AdminDashboardResponse };

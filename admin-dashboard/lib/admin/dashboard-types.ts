export type DashboardMetricValue = number | string | null;

export type AdminDashboardResponse = {
  schools?: {
    total?: number;
    active?: number;
  };
  parents?: {
    total?: number;
    active?: number;
  };
  children?: {
    total?: number;
  };
  cameras?: {
    total?: number;
    active?: number;
    online?: number;
    offline?: number;
    healthy?: number;
  };
  alerts?: {
    open?: number;
    critical?: number;
    warning?: number;
  };
  subscriptions?: {
    active?: number;
    trial?: number;
    expired?: number;
  };
  billing?: {
    monthly_revenue_cents?: number;
    pending_payments?: number;
  };
  playback?: {
    requests_today?: number;
    denied_today?: number;
  };
  auth?: {
    login_failures_today?: number;
  };
  storage?: {
    total_bytes?: number;
    total_gb?: number;
  };
  workers?: {
    healthy?: number;
    total?: number;
    stale?: number;
  };
  [key: string]: unknown;
};

export type HealthLevel = "good" | "warning" | "critical";

export type NormalizedDashboard = {
  schoolsTotal: number;
  schoolsActive: number;
  parentsTotal: number;
  parentsActive: number;
  childrenTotal: number;
  camerasTotal: number;
  camerasActive: number;
  camerasOffline: number;
  camerasHealthy: number;
  camerasHealthyPercent: number | null;
  openAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  subscriptionsActive: number;
  subscriptionsTrial: number;
  monthlyRevenueEtb: number;
  pendingPaymentsEtb: number;
  playbackRequestsToday: number;
  playbackDeniedToday: number;
  loginFailuresToday: number;
  storageGb: number | null;
  storageBytes: number | null;
  workersHealthy: number;
  workersTotal: number;
  workersStale: number;
  workerStatuses: { name: string; status: string }[];
  backendHealthScorePercent: number | null;
  cached: boolean;
};

export type HealthScoreResult = {
  score: number;
  level: HealthLevel;
  label: string;
};

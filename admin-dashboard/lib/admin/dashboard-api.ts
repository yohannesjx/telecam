import { apiFetch } from "@/lib/api";
import { normalizeDashboardData } from "@/lib/admin/dashboard-normalizer";
import type { NormalizedDashboard } from "@/lib/admin/dashboard-types";

export async function getAdminDashboard(): Promise<NormalizedDashboard> {
  const raw = await apiFetch<unknown>("/admin/dashboard", { method: "GET" });
  return normalizeDashboardData(raw);
}

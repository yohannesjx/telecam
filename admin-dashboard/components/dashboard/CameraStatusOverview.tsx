"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import type { NormalizedDashboard } from "@/lib/admin/dashboard-types";
import { formatNumber, formatPercent } from "@/lib/format";

type CameraStatusOverviewProps = {
  data: NormalizedDashboard;
};

const CHART_COLORS = {
  Total: "hsl(226 70% 55%)",
  Active: "hsl(199 89% 48%)",
  Healthy: "hsl(152 69% 40%)",
  Offline: "hsl(0 72% 51%)",
};

export function CameraStatusOverview({ data }: CameraStatusOverviewProps) {
  const chartData = [
    { name: "Total", count: data.camerasTotal, fill: CHART_COLORS.Total },
    { name: "Active", count: data.camerasActive, fill: CHART_COLORS.Active },
    { name: "Healthy", count: data.camerasHealthy, fill: CHART_COLORS.Healthy },
    { name: "Offline", count: data.camerasOffline, fill: CHART_COLORS.Offline },
  ];

  return (
    <SectionCard
      title="Camera Status Overview"
      description={`${formatPercent(data.camerasHealthyPercent, "N/A")} healthy across the fleet`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={formatNumber(data.camerasTotal)} />
        <Stat label="Active" value={formatNumber(data.camerasActive)} />
        <Stat label="Healthy" value={formatNumber(data.camerasHealthy)} />
        <Stat label="Offline" value={formatNumber(data.camerasOffline)} />
      </div>

      <div className="mt-6 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tick={{ fill: "#64748b" }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tick={{ fill: "#64748b" }}
            />
            <Tooltip
              cursor={{ fill: "rgb(248 250 252 / 0.8)" }}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid rgb(226 232 240)",
                boxShadow: "0 4px 12px rgb(15 23 42 / 0.06)",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <span className="text-sm text-slate-500">Cameras healthy</span>
        <StatusBadge
          label={formatPercent(data.camerasHealthyPercent, "N/A")}
          tone="success"
        />
        <span className="text-xs text-slate-400">
          {formatNumber(data.camerasHealthy)} /{" "}
          {formatNumber(data.camerasActive || data.camerasTotal)} cameras healthy
        </span>
      </div>
    </SectionCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

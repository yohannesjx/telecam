import { Server } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { NormalizedDashboard } from "@/lib/admin/dashboard-types";
import { formatNumber } from "@/lib/format";
import { workerSummaryLabel } from "@/lib/health-score";

type WorkerHealthSummaryProps = {
  data: NormalizedDashboard;
};

export function WorkerHealthSummary({ data }: WorkerHealthSummaryProps) {
  const summary = workerSummaryLabel(data);
  const overallLevel =
    data.workersStale > 0
      ? "stale"
      : data.workersHealthy >= data.workersTotal && data.workersTotal > 0
        ? "healthy"
        : "unknown";

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Server className="h-5 w-5 text-slate-400" />
          Worker Health
        </span>
      }
      description="Background workers on the platform"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Healthy" value={formatNumber(data.workersHealthy)} />
        <Stat label="Total" value={formatNumber(data.workersTotal, "Unknown")} />
        <Stat label="Stale" value={formatNumber(data.workersStale)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <span className="text-sm font-medium text-slate-700">
          {data.workersTotal > 0
            ? `${formatNumber(data.workersHealthy)} / ${formatNumber(data.workersTotal)} healthy`
            : "Worker status unknown"}
        </span>
        <StatusBadge label={summary} status={overallLevel} />
      </div>

      {data.workerStatuses.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Worker
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.workerStatuses.map((worker) => (
                <tr
                  key={worker.name}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{worker.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={worker.status} status={worker.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
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

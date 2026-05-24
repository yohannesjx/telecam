"use client";

import { WorkerStatusBadge } from "@/components/system/workers/WorkerStatusBadge";
import { Button } from "@/components/ui/button";
import type { NormalizedWorker } from "@/lib/admin/system-types";
import { formatDateTime, formatDuration, formatRelativeTime } from "@/lib/format";

type WorkersTableProps = {
  workers: NormalizedWorker[];
  onView: (worker: NormalizedWorker) => void;
  emptyMessage?: string;
};

export function WorkersTable({
  workers,
  onView,
  emptyMessage = "No workers found.",
}: WorkersTableProps) {
  if (workers.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Worker</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Effective status</th>
              <th className="px-4 py-3 font-medium">Last heartbeat</th>
              <th className="px-4 py-3 font-medium">Staleness</th>
              <th className="px-4 py-3 font-medium">Instance ID</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Metadata</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr
                key={worker.id ?? worker.name}
                className="cursor-pointer border-b align-top last:border-0 hover:bg-muted/30"
                onClick={() => onView(worker)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{worker.name}</div>
                  {worker.workerType ? (
                    <p className="font-mono text-xs text-muted-foreground">{worker.workerType}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <WorkerStatusBadge status={worker.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {worker.effectiveStatus ?? worker.rawStatus ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <p>{formatDateTime(worker.lastHeartbeatAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(worker.lastHeartbeatAt)}
                  </p>
                </td>
                <td className="px-4 py-3">{formatDuration(worker.stalenessSeconds ?? undefined)}</td>
                <td className="px-4 py-3 font-mono text-xs">{worker.instanceId ?? "—"}</td>
                <td className="px-4 py-3">{worker.version ?? "—"}</td>
                <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-muted-foreground">
                  {worker.metadata && Object.keys(worker.metadata).length > 0
                    ? Object.keys(worker.metadata).slice(0, 3).join(", ")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(worker.updatedAt)}</td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(worker);
                    }}
                  >
                    View details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

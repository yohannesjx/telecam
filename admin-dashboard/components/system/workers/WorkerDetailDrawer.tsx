"use client";

import { X } from "lucide-react";

import { AuditMetadataViewer } from "@/components/audit-logs/AuditMetadataViewer";
import { WorkerStatusBadge } from "@/components/system/workers/WorkerStatusBadge";
import { Button } from "@/components/ui/button";
import type { NormalizedWorker } from "@/lib/admin/system-types";
import { formatDateTime, formatDuration, formatRelativeTime } from "@/lib/format";

type WorkerDetailDrawerProps = {
  worker: NormalizedWorker | null;
  open: boolean;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[140px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

export function WorkerDetailDrawer({ worker, open, onClose }: WorkerDetailDrawerProps) {
  if (!open || !worker) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close worker details"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div className="space-y-2">
            <WorkerStatusBadge status={worker.status} rawStatus={worker.effectiveStatus ?? worker.rawStatus} />
            <h2 className="text-lg font-semibold">{worker.name}</h2>
            {worker.workerType ? (
              <p className="font-mono text-xs text-muted-foreground">{worker.workerType}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <dl>
            <DetailRow label="Effective status" value={worker.effectiveStatus ?? worker.rawStatus ?? worker.status} />
            <DetailRow label="Last heartbeat" value={formatDateTime(worker.lastHeartbeatAt)} />
            <DetailRow
              label="Relative"
              value={formatRelativeTime(worker.lastHeartbeatAt)}
            />
            <DetailRow
              label="Staleness"
              value={formatDuration(worker.stalenessSeconds ?? undefined)}
            />
            <DetailRow label="Instance ID" value={worker.instanceId ?? "N/A"} />
            <DetailRow label="Version" value={worker.version ?? "N/A"} />
            <DetailRow label="Updated" value={formatDateTime(worker.updatedAt)} />
          </dl>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Metadata</h3>
            <AuditMetadataViewer metadata={worker.metadata} compact />
          </div>
        </div>
      </aside>
    </>
  );
}

"use client";

import { X } from "lucide-react";

import { AuditActionBadge } from "@/components/audit-logs/AuditActionBadge";
import { AuditMetadataViewer } from "@/components/audit-logs/AuditMetadataViewer";
import { Button } from "@/components/ui/button";
import type { NormalizedAuditLog } from "@/lib/admin/audit-logs-types";
import { formatDateTime } from "@/lib/format";

type AuditLogDetailDrawerProps = {
  log: NormalizedAuditLog | null;
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

function userLabel(log: NormalizedAuditLog): string {
  const parts = [log.userName, log.userEmail, log.userId].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "N/A";
}

export function AuditLogDetailDrawer({ log, open, onClose }: AuditLogDetailDrawerProps) {
  if (!open || !log) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close audit log details"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div className="space-y-2">
            <AuditActionBadge action={log.action} category={log.category} />
            <h2 className="text-lg font-semibold">Audit log details</h2>
            <p className="text-sm text-muted-foreground">{formatDateTime(log.createdAt)}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <dl>
            <DetailRow label="Action" value={log.action} />
            <DetailRow label="Timestamp" value={formatDateTime(log.createdAt)} />
            <DetailRow label="User" value={userLabel(log)} />
            <DetailRow label="User role" value={log.userRole ?? "N/A"} />
            <DetailRow label="School" value={log.schoolName ?? log.schoolId ?? "N/A"} />
            <DetailRow label="Camera" value={log.cameraName ?? log.cameraId ?? "N/A"} />
            <DetailRow label="IP address" value={log.ipAddress ?? "N/A"} />
            <DetailRow label="User agent" value={log.userAgent ?? "N/A"} />
            <DetailRow label="Request ID" value={log.requestId ?? "N/A"} />
          </dl>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Metadata</h3>
            <AuditMetadataViewer metadata={log.metadata} compact />
          </div>
        </div>
      </aside>
    </>
  );
}

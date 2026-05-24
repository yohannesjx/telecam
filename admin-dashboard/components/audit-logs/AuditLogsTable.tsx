"use client";

import { AuditActionBadge } from "@/components/audit-logs/AuditActionBadge";
import { Button } from "@/components/ui/button";
import type { NormalizedAuditLog } from "@/lib/admin/audit-logs-types";
import { formatDateTime } from "@/lib/format";

type AuditLogsTableProps = {
  logs: NormalizedAuditLog[];
  onView: (log: NormalizedAuditLog) => void;
  emptyMessage?: string;
};

function userLabel(log: NormalizedAuditLog): string {
  if (log.userName && log.userEmail) return `${log.userName} (${log.userEmail})`;
  return log.userName ?? log.userEmail ?? log.userId ?? "—";
}

export function AuditLogsTable({
  logs,
  onView,
  emptyMessage = "No audit logs found.",
}: AuditLogsTableProps) {
  if (logs.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Camera</th>
              <th className="px-4 py-3 font-medium">IP address</th>
              <th className="px-4 py-3 font-medium">User agent</th>
              <th className="px-4 py-3 font-medium">Metadata</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="cursor-pointer border-b align-top last:border-0 hover:bg-muted/30"
                onClick={() => onView(log)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <AuditActionBadge action={log.action} category={log.category} />
                </td>
                <td className="max-w-[180px] px-4 py-3 break-words">{userLabel(log)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {log.schoolName ?? log.schoolId ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {log.cameraName ?? log.cameraId ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{log.ipAddress ?? "—"}</td>
                <td className="max-w-[200px] px-4 py-3">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {log.userAgent ?? "—"}
                  </p>
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  {log.metadata && Object.keys(log.metadata).length > 0 ? (
                    <p className="line-clamp-2 font-mono text-xs text-muted-foreground">
                      {Object.keys(log.metadata).slice(0, 4).join(", ")}
                      {Object.keys(log.metadata).length > 4 ? "…" : ""}
                    </p>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(log);
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

"use client";

import type { NormalizedStorageUsage } from "@/lib/admin/system-types";
import { formatBytes, formatDateTime, formatMoneyUsd, formatNumber } from "@/lib/format";

type StorageUsageTableProps = {
  rows: NormalizedStorageUsage[];
  emptyMessage?: string;
};

export function StorageUsageTable({
  rows,
  emptyMessage = "No storage usage records found.",
}: StorageUsageTableProps) {
  if (rows.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Storage used</th>
              <th className="px-4 py-3 font-medium">Segment count</th>
              <th className="px-4 py-3 font-medium">Estimated cost</th>
              <th className="px-4 py-3 font-medium">Updated at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id ?? `${row.schoolId}-${row.date}`} className="border-b last:border-0">
                <td className="px-4 py-3">{row.schoolName ?? row.schoolId ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.date ?? "—"}</td>
                <td className="px-4 py-3">{formatBytes(row.bytesUsed ?? undefined)}</td>
                <td className="px-4 py-3">{formatNumber(row.segmentCount ?? 0)}</td>
                <td className="px-4 py-3">{formatMoneyUsd(row.estimatedCostUsd)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

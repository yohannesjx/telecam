"use client";

import { PhasePlaceholder } from "@/components/schools/PhasePlaceholder";
import { SchoolsSkeleton } from "@/components/schools/SchoolsSkeleton";
import { useSchoolStorageQuery } from "@/lib/admin/use-schools-queries";
import { formatStorage } from "@/lib/format";

export function SchoolStorageTab({ schoolId }: { schoolId: string }) {
  const query = useSchoolStorageQuery(schoolId);

  if (query.isLoading) return <SchoolsSkeleton />;
  if (query.isError) {
    return (
      <PhasePlaceholder
        title="Storage"
        description="Storage details are coming in System/Storage phase. Could not load usage for this school."
      />
    );
  }

  const rows = query.data ?? [];
  if (rows.length === 0) {
    return (
      <PhasePlaceholder
        title="Storage"
        description="No storage usage records for this school yet."
      />
    );
  }

  const latest = rows[0];
  const totalBytes = rows.reduce((sum, r) => sum + r.totalBytes, 0);
  const totalSegments = rows.reduce((sum, r) => sum + r.segmentCount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Latest day</p>
          <p className="text-lg font-semibold">{latest.date}</p>
          <p className="text-sm text-muted-foreground">
            {formatStorage(latest.totalGb, latest.totalBytes)}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Segment count (latest)</p>
          <p className="text-2xl font-semibold">{latest.segmentCount}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Estimated cost (latest)</p>
          <p className="text-2xl font-semibold">
            {latest.estimatedCostUsd != null ? `$${latest.estimatedCostUsd.toFixed(2)}` : "—"}
          </p>
        </div>
      </div>

      <div className="surface-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Storage</th>
              <th className="px-4 py-3 font-medium">Segments</th>
              <th className="px-4 py-3 font-medium">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((row) => (
              <tr key={row.date} className="border-b last:border-0">
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatStorage(row.totalGb, row.totalBytes)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.segmentCount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.estimatedCostUsd != null ? `$${row.estimatedCostUsd.toFixed(2)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Showing up to 30 days · total segments in view: {totalSegments} · combined bytes:{" "}
          {formatStorage(null, totalBytes)}
        </p>
      </div>
    </div>
  );
}

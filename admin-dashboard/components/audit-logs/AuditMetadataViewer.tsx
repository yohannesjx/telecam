import type { ReactNode } from "react";

import { sanitizeMetadataRecord } from "@/lib/admin/audit-logs-utils";

type AuditMetadataViewerProps = {
  metadata?: Record<string, unknown> | null;
  compact?: boolean;
};

function renderValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean" || typeof value === "number") {
    return <span>{String(value)}</span>;
  }
  if (typeof value === "string") {
    return <span className="break-all">{value}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-inside list-disc space-y-1 pl-2">
        {value.map((item, index) => (
          <li key={index}>{renderValue(item, depth + 1)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return <AuditMetadataViewer metadata={value as Record<string, unknown>} compact />;
  }
  return <span>{String(value)}</span>;
}

export function AuditMetadataViewer({ metadata, compact = false }: AuditMetadataViewerProps) {
  const safe = sanitizeMetadataRecord(metadata ?? null);
  if (!safe || Object.keys(safe).length === 0) {
    return <p className="text-sm text-muted-foreground">No metadata</p>;
  }

  if (compact) {
    return (
      <dl className="space-y-2 text-sm">
        {Object.entries(safe).map(([key, value]) => (
          <div key={key} className="grid gap-1 sm:grid-cols-[minmax(120px,30%)_1fr]">
            <dt className="font-medium text-muted-foreground">{key}</dt>
            <dd>{renderValue(value)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
      {JSON.stringify(safe, null, 2)}
    </pre>
  );
}

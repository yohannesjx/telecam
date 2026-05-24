import type { NormalizedRetentionStatus } from "@/lib/admin/system-types";
import { formatDateTime, formatNumber } from "@/lib/format";

type RetentionDetailsProps = {
  retention: NormalizedRetentionStatus;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[220px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function RetentionDetails({ retention }: RetentionDetailsProps) {
  return (
    <div className="surface-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Retention policy & cleanup</h3>
      <dl>
        <Row label="Worker" value={retention.workerName ?? "N/A"} />
        <Row label="Message" value={retention.message ?? "N/A"} />
        <Row label="Dry run" value={retention.dryRun == null ? "N/A" : retention.dryRun ? "Enabled" : "Disabled"} />
        <Row label="Retention days" value={formatNumber(retention.retentionDays ?? undefined)} />
        <Row
          label="Temp playback retention (minutes)"
          value={formatNumber(retention.tempPlaybackRetentionMinutes ?? undefined)}
        />
        <Row label="Temp playback deleted" value={formatNumber(retention.tempPlaybackDeletedCount ?? 0)} />
        <Row label="Last run" value={formatDateTime(retention.lastRunAt)} />
        <Row label="Next run" value={formatDateTime(retention.nextRunAt)} />
      </dl>
    </div>
  );
}

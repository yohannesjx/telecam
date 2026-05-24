import type { NormalizedSchedulerStatus } from "@/lib/admin/system-types";
import { formatDateTime } from "@/lib/format";

type SchedulerDetailsProps = {
  scheduler: NormalizedSchedulerStatus;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function SchedulerDetails({ scheduler }: SchedulerDetailsProps) {
  return (
    <div className="surface-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Scheduler details</h3>
      <dl>
        <Row label="Timezone" value={scheduler.timezone ?? "N/A"} />
        <Row label="Recording days" value={scheduler.recordingDays?.join(", ") ?? "N/A"} />
        <Row label="School start" value={scheduler.schoolStartTime ?? "N/A"} />
        <Row label="School end" value={scheduler.schoolEndTime ?? "N/A"} />
        <Row label="Current state" value={scheduler.currentState ?? "N/A"} />
        <Row label="Reason" value={scheduler.reason ?? "N/A"} />
        <Row label="Next start" value={formatDateTime(scheduler.nextLiveWindowAt)} />
        <Row label="Next stop" value={formatDateTime(scheduler.nextStopAt)} />
      </dl>
    </div>
  );
}

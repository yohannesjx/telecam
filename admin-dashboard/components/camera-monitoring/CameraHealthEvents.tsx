import type {
  CameraHealthAlert,
  CameraHealthEvent,
  NormalizedSchedulerStatus,
} from "@/lib/admin/camera-monitoring-types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

type CameraHealthEventsProps = {
  events: CameraHealthEvent[];
  alerts: CameraHealthAlert[];
  scheduler?: NormalizedSchedulerStatus;
  playlistExists?: boolean;
};

export function CameraHealthEvents({
  events,
  alerts,
  scheduler,
  playlistExists,
}: CameraHealthEventsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent health events</CardTitle>
          <CardDescription>Latest camera health signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent health events.</p>
          ) : (
            events.map((event, index) => (
              <div key={event.id ?? `${event.eventType}-${index}`} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{event.eventType ?? "EVENT"}</Badge>
                  {event.severity ? <Badge variant="outline">{event.severity}</Badge> : null}
                </div>
                <p className="text-sm">{event.message ?? "No message"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Open alerts</CardTitle>
          <CardDescription>Active alerts for this camera</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open alerts.</p>
          ) : (
            alerts.map((alert, index) => (
              <div
                key={alert.id ?? `${alert.type}-${index}`}
                className="rounded-lg border p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{alert.type ?? "ALERT"}</Badge>
                  {alert.severity ? <Badge variant="secondary">{alert.severity}</Badge> : null}
                  {alert.status ? <Badge variant="outline">{alert.status}</Badge> : null}
                </div>
                <p className="text-sm">{alert.message ?? "No message"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(alert.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle>Stream & schedule status</CardTitle>
          <CardDescription>Recording and scheduler context</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Playlist available" value={playlistExists ? "Yes" : "No"} />
          <Info label="Scheduler state" value={scheduler?.currentState ?? "N/A"} />
          <Info label="Scheduler reason" value={scheduler?.reason ?? "N/A"} />
          <Info label="Recording window" value={
            scheduler?.recordingStartTime && scheduler?.recordingEndTime
              ? `${scheduler.recordingStartTime} – ${scheduler.recordingEndTime}`
              : "N/A"
          } />
          <Info label="Timezone" value={scheduler?.timezone ?? "N/A"} />
          <Info label="Cameras running (desired)" value={String(scheduler?.camerasRunningDesired ?? "N/A")} />
          <Info label="Cameras stopped (desired)" value={String(scheduler?.camerasStoppedDesired ?? "N/A")} />
          <Info label="Next start" value={formatDateTime(scheduler?.nextStartAt)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

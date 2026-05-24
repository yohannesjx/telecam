"use client";

import { X } from "lucide-react";

import { AlertDeliveryBadge } from "@/components/alerts/AlertDeliveryBadge";
import { AlertSeverityBadge } from "@/components/alerts/AlertSeverityBadge";
import { AlertStatusBadge } from "@/components/alerts/AlertStatusBadge";
import { Button } from "@/components/ui/button";
import type { NormalizedAlert, NormalizedAlertDelivery } from "@/lib/admin/alerts-types";
import { formatDateTime } from "@/lib/format";

type AlertDetailDrawerProps = {
  alert: NormalizedAlert | null;
  deliveries: NormalizedAlertDelivery[];
  open: boolean;
  onClose: () => void;
  onAcknowledge: (alert: NormalizedAlert) => void;
  onResolve: (alert: NormalizedAlert) => void;
  isActing?: boolean;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[140px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

export function AlertDetailDrawer({
  alert,
  deliveries,
  open,
  onClose,
  onAcknowledge,
  onResolve,
  isActing = false,
}: AlertDetailDrawerProps) {
  if (!open || !alert) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close alert details"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <AlertSeverityBadge severity={alert.severity} />
              <AlertStatusBadge status={alert.status} />
            </div>
            <h2 className="text-lg font-semibold">{alert.title || alert.type}</h2>
            <p className="text-sm text-muted-foreground">{alert.message}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <dl>
            <DetailRow label="Type" value={alert.type} />
            <DetailRow label="School" value={alert.schoolName ?? alert.schoolId ?? "N/A"} />
            <DetailRow label="Camera" value={alert.cameraName ?? alert.cameraId ?? "N/A"} />
            <DetailRow label="Created" value={formatDateTime(alert.createdAt)} />
            <DetailRow label="Updated" value={formatDateTime(alert.updatedAt)} />
            <DetailRow label="Acknowledged" value={formatDateTime(alert.acknowledgedAt)} />
            <DetailRow label="Resolved" value={formatDateTime(alert.resolvedAt)} />
          </dl>

          {alert.metadata && Object.keys(alert.metadata).length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Metadata</h3>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs">
                {JSON.stringify(alert.metadata, null, 2)}
              </pre>
            </div>
          ) : null}

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Telegram delivery</h3>
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No delivery records.</p>
            ) : (
              <div className="space-y-3">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id ?? `${delivery.alertId}-${delivery.channel}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <AlertDeliveryBadge status={delivery.status} />
                      <span className="text-xs text-muted-foreground">
                        {delivery.channel ?? "Channel"} · {delivery.deliveryKind ?? "delivery"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Attempts: {delivery.attemptCount ?? 0}
                    </p>
                    {delivery.lastError ? (
                      <p className="mt-1 text-xs text-destructive">{delivery.lastError}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sent: {formatDateTime(delivery.sentAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t p-6">
          {alert.status === "open" ? (
            <Button disabled={isActing} onClick={() => onAcknowledge(alert)}>
              Acknowledge
            </Button>
          ) : null}
          {alert.status === "open" || alert.status === "acknowledged" ? (
            <Button variant="outline" disabled={isActing} onClick={() => onResolve(alert)}>
              Resolve
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </>
  );
}

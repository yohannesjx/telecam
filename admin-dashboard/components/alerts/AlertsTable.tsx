"use client";

import { AlertDeliveryBadge } from "@/components/alerts/AlertDeliveryBadge";
import { AlertSeverityBadge } from "@/components/alerts/AlertSeverityBadge";
import { AlertStatusBadge } from "@/components/alerts/AlertStatusBadge";
import { Button } from "@/components/ui/button";
import type { NormalizedAlert, NormalizedAlertDelivery } from "@/lib/admin/alerts-types";
import { summarizeDeliveriesForAlert } from "@/lib/admin/alerts-normalizer";
import { formatDateTime } from "@/lib/format";

type AlertsTableProps = {
  alerts: NormalizedAlert[];
  deliveriesByAlert: Map<string, NormalizedAlertDelivery[]>;
  onView: (alert: NormalizedAlert) => void;
  onAcknowledge: (alert: NormalizedAlert) => void;
  onResolve: (alert: NormalizedAlert) => void;
  actingAlertId?: string | null;
};

export function AlertsTable({
  alerts,
  deliveriesByAlert,
  onView,
  onAcknowledge,
  onResolve,
  actingAlertId,
}: AlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No alerts found.</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Camera</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Telegram</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => {
              const deliveries = deliveriesByAlert.get(alert.id) ?? [];
              const deliverySummary = summarizeDeliveriesForAlert(deliveries);
              const isActing = actingAlertId === alert.id;

              return (
                <tr
                  key={alert.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                  onClick={() => onView(alert)}
                >
                  <td className="px-4 py-3">
                    <AlertSeverityBadge severity={alert.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <AlertStatusBadge status={alert.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{alert.type}</td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2">{alert.message}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {alert.schoolName ?? alert.schoolId ?? "N/A"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {alert.cameraName ?? alert.cameraId ?? "N/A"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(alert.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(alert.updatedAt)}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <AlertDeliveryBadge summary={deliverySummary} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => onView(alert)}>
                        View
                      </Button>
                      {alert.status === "open" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActing}
                          onClick={() => onAcknowledge(alert)}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                      {alert.status === "open" || alert.status === "acknowledged" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActing}
                          onClick={() => onResolve(alert)}
                        >
                          Resolve
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

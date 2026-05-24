import Link from "next/link";

import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { PlaybackAllowedBadge } from "@/components/parents/PlaybackAllowedBadge";
import { Button } from "@/components/ui/button";
import type { NormalizedSubscription } from "@/lib/admin/billing-types";
import { formatDateTime } from "@/lib/format";

type SubscriptionsTableProps = {
  items: NormalizedSubscription[];
  canManage?: boolean;
  onChangeStatus?: (item: NormalizedSubscription) => void;
  onExtend?: (item: NormalizedSubscription) => void;
};

export function SubscriptionsTable({
  items,
  canManage = false,
  onChangeStatus,
  onExtend,
}: SubscriptionsTableProps) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No subscriptions found.</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Starts</th>
              <th className="px-4 py-3 font-medium">Ends</th>
              <th className="px-4 py-3 font-medium">Days left</th>
              <th className="px-4 py-3 font-medium">Playback</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((sub) => (
              <tr key={sub.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{sub.parentName ?? "—"}</div>
                  {sub.parentId ? (
                    <Link href={`/parents/${sub.parentId}`} className="text-xs text-muted-foreground hover:text-foreground">
                      View parent
                    </Link>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{sub.schoolName ?? "—"}</td>
                <td className="px-4 py-3">
                  <BillingStatusBadge status={sub.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(sub.startsAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(sub.endsAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {sub.daysRemaining ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <PlaybackAllowedBadge value={sub.playbackAllowed} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(sub.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {canManage && onChangeStatus ? (
                      <Button variant="outline" size="sm" onClick={() => onChangeStatus(sub)}>
                        Change status
                      </Button>
                    ) : null}
                    {canManage && onExtend ? (
                      <Button variant="outline" size="sm" onClick={() => onExtend(sub)}>
                        Extend
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

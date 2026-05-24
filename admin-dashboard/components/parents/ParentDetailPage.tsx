"use client";

import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/Can";
import { ParentBillingSection } from "@/components/parents/ParentBillingSection";
import { ParentStatusBadge } from "@/components/parents/ParentStatusBadge";
import { useParentDetailQuery } from "@/lib/admin/use-parents-queries";

export function ParentDetailPage({ parentId }: { parentId: string }) {
  const query = useParentDetailQuery(parentId);
  const parent = query.data;

  if (query.isLoading) return <p>Loading parent…</p>;
  if (!parent) return <p>Parent not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={() => void query.refetch()}>Refresh</Button>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Email</p>
        <p>{parent.email || "—"}</p>
        <p className="mt-2 text-sm text-muted-foreground">Phone</p>
        <p>{parent.phone || "—"}</p>
        <div className="mt-2"><ParentStatusBadge status={parent.status} /></div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-medium">Linked children</h2>
        {(parent.linkedChildren ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No linked children found.</p>
        ) : (
          <div className="space-y-2">
            {(parent.linkedChildren ?? []).map((child) => (
              <div key={child.id} className="rounded border px-3 py-2 text-sm">
                {child.name} · {child.schoolName ?? "Unknown school"} · {child.classroomName ?? "No classroom"}
              </div>
            ))}
          </div>
        )}
      </div>
      <Can permission="billing:view">
        <ParentBillingSection parentId={parentId} />
      </Can>
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Device management is coming later.
      </div>
    </div>
  );
}

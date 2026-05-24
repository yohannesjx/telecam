"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLinkParentToChildMutation, useParentsQuery, useChildParentsQuery } from "@/lib/admin/use-parents-queries";

export function ChildParentsDialog({
  childId,
  open,
  onClose,
}: {
  childId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [parentId, setParentId] = useState("");
  const parentsQuery = useParentsQuery();
  const childParentsQuery = useChildParentsQuery(childId, open && Boolean(childId));
  const linkMutation = useLinkParentToChildMutation();

  const available = useMemo(
    () => (parentsQuery.data ?? []).filter((p) => !childParentsQuery.data?.some((cp) => cp.id === p.id)),
    [parentsQuery.data, childParentsQuery.data],
  );

  if (!open || !childId) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Manage Parents</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      <div className="space-y-2">
        {(childParentsQuery.data ?? []).map((p) => (
          <div key={p.id} className="rounded border px-3 py-2 text-sm">{p.name} · {p.email}</div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Parent ID"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          list={`parents-${childId}`}
        />
        <datalist id={`parents-${childId}`}>
          {available.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
          ))}
        </datalist>
        <Button
          onClick={() =>
            linkMutation.mutate({ childId, input: { parent_id: parentId } }, { onSuccess: () => setParentId("") })
          }
          disabled={!parentId || linkMutation.isPending}
        >
          Link
        </Button>
      </div>
    </div>
  );
}

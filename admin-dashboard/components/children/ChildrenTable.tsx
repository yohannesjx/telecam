import { EntityStatusBadge } from "@/components/classrooms/EntityStatusBadge";
import { Button } from "@/components/ui/button";
import type { NormalizedChild } from "@/lib/admin/children-types";
import { formatDateTime } from "@/lib/format";

type ChildrenTableProps = {
  items: NormalizedChild[];
  canManage?: boolean;
  onEdit?: (child: NormalizedChild) => void;
  onChangeClassroom?: (child: NormalizedChild) => void;
  onManageParents?: (child: NormalizedChild) => void;
};

function countOrDash(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function ChildrenTable({
  items,
  canManage = false,
  onEdit,
  onChangeClassroom,
  onManageParents,
}: ChildrenTableProps) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No children found.</p>
        <p className="mt-1 text-sm text-muted-foreground">Add the first child.</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Child name</th>
              <th className="px-4 py-3 font-medium">Classroom</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Linked parents</th>
              <th className="px-4 py-3 font-medium">Created at</th>
              <th className="px-4 py-3 font-medium">Updated at</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((child) => (
              <tr key={child.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{child.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {child.classroomName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <EntityStatusBadge status={child.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {countOrDash(child.linkedParentsCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(child.createdAt)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(child.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {canManage && onEdit ? (
                      <Button variant="outline" size="sm" onClick={() => onEdit(child)}>
                        Edit
                      </Button>
                    ) : null}
                    {canManage && onChangeClassroom ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onChangeClassroom(child)}
                      >
                        Change classroom
                      </Button>
                    ) : null}
                    {onManageParents ? (
                      <Button variant="ghost" size="sm" onClick={() => onManageParents(child)}>
                        Manage parents
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

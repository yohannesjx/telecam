import { EntityStatusBadge } from "@/components/classrooms/EntityStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type ClassroomsTableProps = {
  classrooms: NormalizedClassroom[];
  canManage?: boolean;
  onEdit?: (classroom: NormalizedClassroom) => void;
  onViewChildren?: (classroom: NormalizedClassroom) => void;
  onViewCameras?: (classroom: NormalizedClassroom) => void;
};

function countOrDash(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function ClassroomsTable({
  classrooms,
  canManage = false,
  onEdit,
  onViewChildren,
  onViewCameras,
}: ClassroomsTableProps) {
  if (classrooms.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No classrooms found.</p>
        <p className="mt-1 text-sm text-muted-foreground">Create your first classroom.</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Classroom name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Children</th>
              <th className="px-4 py-3 font-medium">Cameras</th>
              <th className="px-4 py-3 font-medium">Created at</th>
              <th className="px-4 py-3 font-medium">Updated at</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((room) => (
              <tr key={room.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{room.name}</td>
                <td className="px-4 py-3">
                  <EntityStatusBadge status={room.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {countOrDash(room.childrenCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {countOrDash(room.camerasCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(room.createdAt)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(room.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {canManage && onEdit ? (
                      <Button variant="outline" size="sm" onClick={() => onEdit(room)}>
                        Edit
                      </Button>
                    ) : null}
                    {onViewChildren ? (
                      <Button variant="outline" size="sm" onClick={() => onViewChildren(room)}>
                        View children
                      </Button>
                    ) : null}
                    {onViewCameras ? (
                      <button
                        type="button"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        onClick={() => onViewCameras(room)}
                      >
                        View cameras
                      </button>
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

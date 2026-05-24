import Link from "next/link";

import { SchoolStatusBadge } from "@/components/schools/SchoolStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import type { NormalizedSchool } from "@/lib/admin/schools-types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type SchoolsTableProps = {
  schools: NormalizedSchool[];
  canEdit?: boolean;
  emptyMessage?: string;
};

function countOrDash(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function SchoolsTable({
  schools,
  canEdit = true,
  emptyMessage = "No schools found.",
}: SchoolsTableProps) {
  if (schools.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="surface-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">School name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">City / Location</th>
              <th className="px-4 py-3 font-medium">Timezone</th>
              <th className="px-4 py-3 font-medium">Classrooms</th>
              <th className="px-4 py-3 font-medium">Children</th>
              <th className="px-4 py-3 font-medium">Cameras</th>
              <th className="px-4 py-3 font-medium">Parents</th>
              <th className="px-4 py-3 font-medium">Created at</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{school.name}</td>
                <td className="px-4 py-3">
                  <SchoolStatusBadge status={school.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {school.city ?? school.address ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{school.timezone ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {countOrDash(school.classroomsCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {countOrDash(school.childrenCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {countOrDash(school.camerasCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {countOrDash(school.parentsCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(school.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/schools/${school.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      View
                    </Link>
                    {canEdit ? (
                      <Link
                        href={`/schools/${school.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Edit
                      </Link>
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

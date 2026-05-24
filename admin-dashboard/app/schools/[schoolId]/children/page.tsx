import { Suspense } from "react";

import { ChildrenTab } from "@/components/children/ChildrenTab";
import { ClassroomsSkeleton } from "@/components/classrooms/ClassroomsSkeleton";
import { SchoolBreadcrumbs } from "@/components/schools/SchoolBreadcrumbs";
import { DashboardShell } from "@/components/layout/DashboardShell";

type PageProps = {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ classroomId?: string }>;
};

export default async function SchoolChildrenRoutePage({
  params,
  searchParams,
}: PageProps) {
  const { schoolId } = await params;
  const { classroomId } = await searchParams;

  return (
    <DashboardShell title="Children" subtitle="Manage children for this school">
      <Suspense fallback={<ClassroomsSkeleton />}>
        <div className="space-y-4">
          <SchoolBreadcrumbs
            items={[
              { label: "Schools", href: "/schools" },
              { label: "School", href: `/schools/${schoolId}` },
              { label: "Children" },
            ]}
          />
          <ChildrenTab schoolId={schoolId} initialClassroomId={classroomId ?? ""} />
        </div>
      </Suspense>
    </DashboardShell>
  );
}

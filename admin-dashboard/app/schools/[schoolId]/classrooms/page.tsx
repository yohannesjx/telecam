import { Suspense } from "react";

import { ClassroomsTab } from "@/components/classrooms/ClassroomsTab";
import { SchoolBreadcrumbs } from "@/components/schools/SchoolBreadcrumbs";
import { ClassroomsSkeleton } from "@/components/classrooms/ClassroomsSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";

type PageProps = {
  params: Promise<{ schoolId: string }>;
};

export default async function SchoolClassroomsRoutePage({ params }: PageProps) {
  const { schoolId } = await params;

  return (
    <DashboardShell title="Classrooms" subtitle="Manage classrooms for this school">
      <Suspense fallback={<ClassroomsSkeleton />}>
        <div className="space-y-4">
          <SchoolBreadcrumbs
            items={[
              { label: "Schools", href: "/schools" },
              { label: "School", href: `/schools/${schoolId}` },
              { label: "Classrooms" },
            ]}
          />
          <ClassroomsTab schoolId={schoolId} />
        </div>
      </Suspense>
    </DashboardShell>
  );
}

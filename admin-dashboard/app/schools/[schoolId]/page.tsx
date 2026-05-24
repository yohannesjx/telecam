import { Suspense } from "react";

import { SchoolDetailPage } from "@/components/schools/SchoolDetailPage";
import { SchoolsSkeleton } from "@/components/schools/SchoolsSkeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";

type PageProps = {
  params: Promise<{ schoolId: string }>;
};

export default async function SchoolDetailRoutePage({ params }: PageProps) {
  const { schoolId } = await params;

  return (
    <DashboardShell title="School" subtitle="School details and setup">
      <Suspense fallback={<SchoolsSkeleton />}>
        <SchoolDetailPage schoolId={schoolId} />
      </Suspense>
    </DashboardShell>
  );
}

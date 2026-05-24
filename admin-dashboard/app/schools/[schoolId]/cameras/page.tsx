import { SchoolCamerasPage } from "@/components/cameras/SchoolCamerasPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

type PageProps = {
  params: Promise<{ schoolId: string }>;
};

export default async function SchoolCamerasRoutePage({ params }: PageProps) {
  const { schoolId } = await params;

  return (
    <DashboardShell title="School cameras" subtitle="Cameras for this school">
      <SchoolCamerasPage schoolId={schoolId} />
    </DashboardShell>
  );
}

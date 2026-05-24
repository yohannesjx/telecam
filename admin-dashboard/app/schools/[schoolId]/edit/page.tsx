import { EditSchoolPage } from "@/components/schools/EditSchoolPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

type PageProps = {
  params: Promise<{ schoolId: string }>;
};

export default async function EditSchoolRoutePage({ params }: PageProps) {
  const { schoolId } = await params;

  return (
    <DashboardShell title="Edit School" subtitle="Update school details">
      <EditSchoolPage schoolId={schoolId} />
    </DashboardShell>
  );
}

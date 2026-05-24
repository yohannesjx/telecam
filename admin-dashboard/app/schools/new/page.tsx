import { CreateSchoolGuard } from "@/components/schools/CreateSchoolGuard";
import { CreateSchoolPage } from "@/components/schools/CreateSchoolPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function NewSchoolRoutePage() {
  return (
    <DashboardShell title="New School" subtitle="Create a new school">
      <CreateSchoolGuard>
        <CreateSchoolPage />
      </CreateSchoolGuard>
    </DashboardShell>
  );
}

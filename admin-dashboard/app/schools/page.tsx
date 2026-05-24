import { SchoolsPage } from "@/components/schools/SchoolsPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function SchoolsRoutePage() {
  return (
    <DashboardShell title="Schools" subtitle="Manage schools and school-level setup">
      <SchoolsPage />
    </DashboardShell>
  );
}

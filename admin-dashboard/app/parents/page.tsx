import { ParentsPage } from "@/components/parents/ParentsPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ParentsRoute() {
  return (
    <DashboardShell
      title="Parents"
      subtitle="Manage parent accounts and child access"
    >
      <ParentsPage />
    </DashboardShell>
  );
}

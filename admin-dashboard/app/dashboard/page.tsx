import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Monitor schools, cameras, alerts, and workers"
    >
      <div className="space-y-6">
        <DashboardWelcome />
        <DashboardOverview />
      </div>
    </DashboardShell>
  );
}

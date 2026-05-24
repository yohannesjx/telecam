import { UsersPage } from "@/components/users/UsersPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function UsersRoute() {
  return (
    <DashboardShell title="Users" subtitle="Manage platform admin and technician accounts">
      <UsersPage />
    </DashboardShell>
  );
}

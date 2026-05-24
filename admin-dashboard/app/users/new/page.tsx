import { UserForm } from "@/components/users/UserForm";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function NewUserRoute() {
  return (
    <DashboardShell title="Create user" subtitle="Add a new admin or technician account">
      <UserForm />
    </DashboardShell>
  );
}

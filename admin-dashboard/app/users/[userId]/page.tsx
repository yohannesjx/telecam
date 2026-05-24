import { UserDetailPage } from "@/components/users/UserDetailPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

type UserDetailRouteProps = {
  params: Promise<{ userId: string }>;
};

export default async function UserDetailRoute({ params }: UserDetailRouteProps) {
  const { userId } = await params;

  return (
    <DashboardShell title="User details" subtitle="Manage profile, role, and security">
      <UserDetailPage userId={userId} />
    </DashboardShell>
  );
}

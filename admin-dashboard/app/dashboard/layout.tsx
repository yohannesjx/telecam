import { RequireAuth } from "@/lib/auth/guards";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

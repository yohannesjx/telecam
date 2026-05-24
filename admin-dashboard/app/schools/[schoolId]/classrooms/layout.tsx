import { RequireAuth } from "@/lib/auth/guards";

export default function SchoolClassroomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

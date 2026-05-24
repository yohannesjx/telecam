import { RequireAuth } from "@/lib/auth/guards";

export default function SchoolChildrenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

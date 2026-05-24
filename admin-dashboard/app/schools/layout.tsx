import { RequireAuth } from "@/lib/auth/guards";

export default function SchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

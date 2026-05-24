import { RequireAuth } from "@/lib/auth/guards";

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

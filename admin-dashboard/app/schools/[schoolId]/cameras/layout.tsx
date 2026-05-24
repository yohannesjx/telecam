import { RequireAuth } from "@/lib/auth/guards";

export default function SchoolCamerasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

import { RequireAuth } from "@/lib/auth/guards";

export default function CameraMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

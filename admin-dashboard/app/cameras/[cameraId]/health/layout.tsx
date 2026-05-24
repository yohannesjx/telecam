import { RequireAuth } from "@/lib/auth/guards";

export default function CameraHealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

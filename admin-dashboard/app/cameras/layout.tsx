import { RequireAuth } from "@/lib/auth/guards";

export default function CamerasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}

import { CamerasPage } from "@/components/cameras/CamerasPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function CamerasRoutePage() {
  return (
    <DashboardShell title="Cameras" subtitle="Manage camera configuration and stream settings">
      <CamerasPage />
    </DashboardShell>
  );
}

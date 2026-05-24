import Link from "next/link";

import { ParentDetailPage } from "@/components/parents/ParentDetailPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function ParentDetailRoute({
  params,
}: {
  params: Promise<{ parentId: string }>;
}) {
  const { parentId } = await params;
  return (
    <DashboardShell title="Parent" subtitle="Parent profile and billing">
      <div className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/parents" className="hover:text-foreground">
            Parents
          </Link>
          <span className="mx-2">→</span>
          <span className="text-foreground">Details</span>
        </nav>
        <ParentDetailPage parentId={parentId} />
      </div>
    </DashboardShell>
  );
}

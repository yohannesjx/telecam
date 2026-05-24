import Link from "next/link";

import { ParentForm } from "@/components/parents/ParentForm";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function NewParentPage() {
  return (
    <DashboardShell title="New Parent" subtitle="Create a parent account">
      <div className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/parents" className="hover:text-foreground">
            Parents
          </Link>
          <span className="mx-2">→</span>
          <span className="text-foreground">New Parent</span>
        </nav>
        <ParentForm />
      </div>
    </DashboardShell>
  );
}

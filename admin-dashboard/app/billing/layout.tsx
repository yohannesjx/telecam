import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/lib/auth/guards";

export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell
        title="Billing"
        subtitle="Subscriptions, payments, and invoices"
      >
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}

"use client";

import Link from "next/link";

import { InvoicesPage } from "@/components/billing/invoices/InvoicesPage";
import { PaymentsPage } from "@/components/billing/payments/PaymentsPage";
import { SubscriptionsPage } from "@/components/billing/subscriptions/SubscriptionsPage";
import { RevenueShareSection } from "@/components/schools/RevenueShareSection";
import { SchoolBreadcrumbs } from "@/components/schools/SchoolBreadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { canSetRevenueShare, useSchoolDetailQuery } from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

export function SchoolBillingPage({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const schoolQuery = useSchoolDetailQuery(schoolId);
  const school = schoolQuery.data;

  return (
    <div className="space-y-8">
      <SchoolBreadcrumbs
        items={[
          { label: "Schools", href: "/schools" },
          { label: school?.name ?? "School", href: `/schools/${schoolId}` },
          { label: "Billing" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">School billing</h1>
          <p className="text-sm text-muted-foreground">
            {school?.name ?? "Loading…"} — subscriptions, payments, and invoices
          </p>
        </div>
        <Link href={`/schools/${schoolId}?tab=billing`} className={cn(buttonVariants({ variant: "outline" }))}>
          Back to school
        </Link>
      </div>

      <RevenueShareSection
        schoolId={schoolId}
        canEdit={canSetRevenueShare(user?.role)}
      />

      <SubscriptionsPage fixedSchoolId={schoolId} />
      <PaymentsPage fixedSchoolId={schoolId} />
      <InvoicesPage fixedSchoolId={schoolId} />
    </div>
  );
}

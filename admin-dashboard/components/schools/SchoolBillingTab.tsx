"use client";

import Link from "next/link";

import { InvoicesPage } from "@/components/billing/invoices/InvoicesPage";
import { PaymentsPage } from "@/components/billing/payments/PaymentsPage";
import { SubscriptionsPage } from "@/components/billing/subscriptions/SubscriptionsPage";
import { RevenueShareSection } from "@/components/schools/RevenueShareSection";
import { buttonVariants } from "@/components/ui/button";
import { canSetRevenueShare } from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

type SchoolBillingTabProps = {
  schoolId: string;
  canSetRevenueShare?: boolean;
};

export function SchoolBillingTab({ schoolId, canSetRevenueShare: canSetProp }: SchoolBillingTabProps) {
  const { user } = useAuth();
  const canSet = canSetProp ?? canSetRevenueShare(user?.role);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Billing for this school</p>
        <Link
          href={`/schools/${schoolId}/billing`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Full billing page
        </Link>
      </div>
      <RevenueShareSection schoolId={schoolId} canEdit={canSet} />
      <SubscriptionsPage fixedSchoolId={schoolId} />
      <PaymentsPage fixedSchoolId={schoolId} />
      <InvoicesPage fixedSchoolId={schoolId} />
    </div>
  );
}

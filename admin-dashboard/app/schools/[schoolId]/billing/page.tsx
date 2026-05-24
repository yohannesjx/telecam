import { SchoolBillingPage } from "@/components/billing/school/SchoolBillingPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function SchoolBillingRoute({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;

  return (
    <DashboardShell
      title="School billing"
      subtitle="Subscriptions, payments, and invoices for this school"
    >
      <SchoolBillingPage schoolId={schoolId} />
    </DashboardShell>
  );
}

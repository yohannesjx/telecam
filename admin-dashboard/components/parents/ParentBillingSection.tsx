"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { MoneyText } from "@/components/billing/MoneyText";
import { PlaybackAllowedBadge } from "@/components/parents/PlaybackAllowedBadge";
import { CreateInvoiceDialog } from "@/components/billing/invoices/CreateInvoiceDialog";
import { CreatePaymentDialog } from "@/components/billing/payments/CreatePaymentDialog";
import { CreateSubscriptionDialog } from "@/components/billing/subscriptions/CreateSubscriptionDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useInvoicesQuery,
  usePaymentsQuery,
  useSubscriptionsQuery,
  canManageBilling,
} from "@/lib/admin/use-billing-queries";
import { useParentsQuery } from "@/lib/admin/use-parents-queries";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ParentBillingSection({ parentId }: { parentId: string }) {
  const { user } = useAuth();
  const canManage = canManageBilling(user?.role);
  const [createSubOpen, setCreateSubOpen] = useState(false);
  const [createPayOpen, setCreatePayOpen] = useState(false);
  const [createInvOpen, setCreateInvOpen] = useState(false);

  const subsQuery = useSubscriptionsQuery({ parentId });
  const paymentsQuery = usePaymentsQuery({ parentId });
  const invoicesQuery = useInvoicesQuery({ parentId });
  const schoolsQuery = useSchoolsListQuery();
  const parentsQuery = useParentsQuery();

  const schools = useMemo(
    () => (schoolsQuery.data ?? []).map((s) => ({ id: s.id, label: s.name })),
    [schoolsQuery.data],
  );
  const parents = useMemo(
    () =>
      (parentsQuery.data ?? []).map((p) => ({
        id: p.id,
        label: `${p.name} (${p.email || "no email"})`,
      })),
    [parentsQuery.data],
  );

  const subscriptions = subsQuery.data ?? [];
  const payments = (paymentsQuery.data ?? []).slice(0, 5);
  const invoices = (invoicesQuery.data ?? []).slice(0, 5);
  const activeSub = subscriptions.find((s) => s.status === "ACTIVE" || s.status === "TRIAL");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Billing</h2>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateSubOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Subscription
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreatePayOpen(true)}>
              Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateInvOpen(true)}>
              Invoice
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Current subscription</p>
        {activeSub ? (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <BillingStatusBadge status={activeSub.status} />
              <PlaybackAllowedBadge value={activeSub.playbackAllowed} />
            </div>
            <p className="text-sm">
              {activeSub.schoolName} · ends {formatDateTime(activeSub.endsAt)}
            </p>
          </div>
        ) : subscriptions.length > 0 ? (
          <p className="mt-2 text-sm">No active subscription. Latest status: {subscriptions[0]?.status}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No subscriptions for this parent.</p>
        )}
        <Link href="/billing/subscriptions" className={cn(buttonVariants({ variant: "link" }), "mt-2 px-0")}>
          View all subscriptions
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">Recent payments</p>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No payments found.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <MoneyText amountCents={p.amountCents} currency={p.currency} /> · {p.method}
                </span>
                <BillingStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
        <Link href="/billing/payments" className={cn(buttonVariants({ variant: "link" }), "mt-2 px-0")}>
          View all payments
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">Recent invoices</p>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No invoices found.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{inv.invoiceNumber ?? inv.id.slice(0, 8)}</span>
                <span className="flex items-center gap-2">
                  <MoneyText amountCents={inv.amountCents} currency={inv.currency} />
                  <BillingStatusBadge status={inv.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/billing/invoices" className={cn(buttonVariants({ variant: "link" }), "mt-2 px-0")}>
          View all invoices
        </Link>
      </div>

      <CreateSubscriptionDialog
        open={createSubOpen}
        onClose={() => setCreateSubOpen(false)}
        schools={schools}
        parents={parents}
        defaultParentId={parentId}
      />
      <CreatePaymentDialog
        open={createPayOpen}
        onClose={() => setCreatePayOpen(false)}
        schools={schools}
        parents={parents}
        defaultParentId={parentId}
      />
      <CreateInvoiceDialog
        open={createInvOpen}
        onClose={() => setCreateInvOpen(false)}
        schools={schools}
        parents={parents}
        defaultParentId={parentId}
      />
    </div>
  );
}

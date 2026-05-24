"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { BillingError } from "@/components/billing/BillingError";
import { BillingFiltersBar } from "@/components/billing/BillingFiltersBar";
import { BillingNav } from "@/components/billing/BillingNav";
import { BillingSkeleton } from "@/components/billing/BillingSkeleton";
import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { MoneyText } from "@/components/billing/MoneyText";
import { CreatePaymentDialog } from "@/components/billing/payments/CreatePaymentDialog";
import { PaymentSummaryCards } from "@/components/billing/payments/PaymentSummaryCards";
import { ListEmptyState } from "@/components/common/ListEmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { Button } from "@/components/ui/button";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { filterBillingItems } from "@/lib/admin/billing-normalizer";
import type { NormalizedPayment } from "@/lib/admin/billing-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  canManageBilling,
  useApprovePaymentMutation,
  usePaymentsQuery,
  useRejectPaymentMutation,
} from "@/lib/admin/use-billing-queries";
import { useParentsQuery } from "@/lib/admin/use-parents-queries";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatTimeOnly } from "@/lib/format";

export function PaymentsPage({
  fixedSchoolId,
  fixedParentId,
}: {
  fixedSchoolId?: string;
  fixedParentId?: string;
} = {}) {
  const { user } = useAuth();
  const canManage = canManageBilling(user?.role);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [schoolId, setSchoolId] = useState(fixedSchoolId ?? "");
  const [parentId, setParentId] = useState(fixedParentId ?? "");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const paymentsQuery = usePaymentsQuery({
    schoolId: schoolId || undefined,
    parentId: parentId || undefined,
    status: status !== "all" ? status : undefined,
    method: method !== "all" ? method : undefined,
  });
  const approveMutation = useApprovePaymentMutation();
  const rejectMutation = useRejectPaymentMutation();
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

  const filtered = useMemo(
    () => filterBillingItems(paymentsQuery.data ?? [], { search: debouncedSearch }),
    [paymentsQuery.data, debouncedSearch],
  );

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) ||
    Boolean(schoolId) ||
    Boolean(parentId) ||
    status !== "all" ||
    method !== "all";

  const pagination = useClientPagination(filtered, {
    resetDeps: [debouncedSearch, schoolId, parentId, status, method],
  });

  const clearFilters = () => {
    setSearch("");
    if (!fixedSchoolId) setSchoolId("");
    if (!fixedParentId) setParentId("");
    setStatus("all");
    setMethod("all");
  };

  const handleRefresh = () => {
    void paymentsQuery.refetch();
    setLastUpdated(new Date());
  };

  const approve = async (payment: NormalizedPayment) => {
    if (!window.confirm("Approve this payment?")) return;
    try {
      await approveMutation.mutateAsync({ id: payment.id });
      toast.success("Payment approved.");
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not approve payment.");
    }
  };

  const reject = async (payment: NormalizedPayment) => {
    const notes = window.prompt("Rejection reason (required):");
    if (!notes?.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: payment.id, input: { notes: notes.trim() } });
      toast.success("Payment rejected.");
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not reject payment.");
    }
  };

  if (paymentsQuery.isLoading) return <BillingSkeleton />;
  if (paymentsQuery.isError) {
    return (
      <BillingError
        title="Payments unavailable"
        message="Could not load payments."
        onRetry={handleRefresh}
        isRetrying={paymentsQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!fixedSchoolId && !fixedParentId ? <BillingNav /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Track manual bank, Telebirr, and cash payments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={paymentsQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${paymentsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Payment
            </Button>
          ) : null}
        </div>
      </div>

      <PaymentSummaryCards items={filtered} />

      {!fixedSchoolId && !fixedParentId ? (
        <BillingFiltersBar
          search={search}
          onSearchChange={setSearch}
          schoolId={schoolId}
          onSchoolIdChange={setSchoolId}
          parentId={parentId}
          onParentIdChange={setParentId}
          status={status}
          onStatusChange={setStatus}
          schools={schools}
          parents={parents}
          method={method}
          onMethodChange={setMethod}
          statusOptions={[
            { value: "all", label: "All statuses" },
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]}
          methodOptions={[
            { value: "all", label: "All methods" },
            { value: "BANK_TRANSFER", label: "Bank transfer" },
            { value: "TELEBIRR", label: "Telebirr" },
            { value: "CASH", label: "Cash" },
          ]}
          showClear={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      {filtered.length === 0 ? (
        <ListEmptyState filtered={hasActiveFilters} title="No payments found" />
      ) : (
        <>
          <ListResultsMeta
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            filtered={hasActiveFilters}
          />
          <div className="surface-table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Parent</th>
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{payment.parentName ?? payment.parentId ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{payment.schoolName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <MoneyText amountCents={payment.amountCents} currency={payment.currency} />
                    </td>
                    <td className="px-4 py-3">{payment.method}</td>
                    <td className="px-4 py-3">
                      <BillingStatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{payment.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(payment.createdAt)}</td>
                    <td className="px-4 py-3">
                      {canManage && payment.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => void approve(payment)}>
                            Approve
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => void reject(payment)}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          <ListPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}

      <CreatePaymentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        schools={schools}
        parents={parents}
        defaultParentId={fixedParentId}
        defaultSchoolId={fixedSchoolId}
      />
    </div>
  );
}

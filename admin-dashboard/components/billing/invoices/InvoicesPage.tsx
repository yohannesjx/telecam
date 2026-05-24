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
import { CreateInvoiceDialog } from "@/components/billing/invoices/CreateInvoiceDialog";
import { InvoiceSummaryCards } from "@/components/billing/invoices/InvoiceSummaryCards";
import { ListEmptyState } from "@/components/common/ListEmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { Button } from "@/components/ui/button";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { filterBillingItems } from "@/lib/admin/billing-normalizer";
import type { NormalizedInvoice } from "@/lib/admin/billing-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  canManageBilling,
  useInvoicesQuery,
  useMarkInvoicePaidMutation,
  useVoidInvoiceMutation,
} from "@/lib/admin/use-billing-queries";
import { useParentsQuery } from "@/lib/admin/use-parents-queries";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatTimeOnly } from "@/lib/format";

export function InvoicesPage({
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
  const [createOpen, setCreateOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const invoicesQuery = useInvoicesQuery({
    schoolId: schoolId || undefined,
    parentId: parentId || undefined,
    status: status !== "all" ? status : undefined,
  });
  const markPaidMutation = useMarkInvoicePaidMutation();
  const voidMutation = useVoidInvoiceMutation();
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
    () => filterBillingItems(invoicesQuery.data ?? [], { search: debouncedSearch }),
    [invoicesQuery.data, debouncedSearch],
  );

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) ||
    Boolean(schoolId) ||
    Boolean(parentId) ||
    status !== "all";

  const pagination = useClientPagination(filtered, {
    resetDeps: [debouncedSearch, schoolId, parentId, status],
  });

  const clearFilters = () => {
    setSearch("");
    if (!fixedSchoolId) setSchoolId("");
    if (!fixedParentId) setParentId("");
    setStatus("all");
  };

  const handleRefresh = () => {
    void invoicesQuery.refetch();
    setLastUpdated(new Date());
  };

  const markPaid = async (invoice: NormalizedInvoice) => {
    if (!window.confirm("Mark this invoice as paid?")) return;
    try {
      await markPaidMutation.mutateAsync(invoice.id);
      toast.success("Invoice marked paid.");
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not mark invoice paid.");
    }
  };

  const voidInvoice = async (invoice: NormalizedInvoice) => {
    const reason = window.prompt("Void reason (required):");
    if (!reason?.trim()) return;
    try {
      await voidMutation.mutateAsync(invoice.id);
      toast.success("Invoice voided.");
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not void invoice.");
    }
  };

  if (invoicesQuery.isLoading) return <BillingSkeleton />;
  if (invoicesQuery.isError) {
    return (
      <BillingError
        title="Invoices unavailable"
        message="Could not load invoices."
        onRetry={handleRefresh}
        isRetrying={invoicesQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!fixedSchoolId && !fixedParentId ? <BillingNav /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Create and manage manual invoices</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={invoicesQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${invoicesQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          ) : null}
        </div>
      </div>

      <InvoiceSummaryCards items={filtered} />

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
          statusOptions={[
            { value: "all", label: "All statuses" },
            { value: "OPEN", label: "Open" },
            { value: "PAID", label: "Paid" },
            { value: "VOID", label: "Void" },
          ]}
          showClear={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      {filtered.length === 0 ? (
        <ListEmptyState filtered={hasActiveFilters} title="No invoices found" />
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
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Parent</th>
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{invoice.invoiceNumber ?? invoice.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{invoice.parentName ?? invoice.parentId ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{invoice.schoolName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <MoneyText amountCents={invoice.amountCents} currency={invoice.currency} />
                    </td>
                    <td className="px-4 py-3">
                      <BillingStatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{invoice.dueDate ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(invoice.paidAt)}</td>
                    <td className="px-4 py-3">
                      {canManage && invoice.status === "OPEN" ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => void markPaid(invoice)}>
                            Mark paid
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => void voidInvoice(invoice)}>
                            Void
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

      <CreateInvoiceDialog
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

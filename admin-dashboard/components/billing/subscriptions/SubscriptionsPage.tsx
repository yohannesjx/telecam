"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { BillingError } from "@/components/billing/BillingError";
import { BillingFiltersBar } from "@/components/billing/BillingFiltersBar";
import { BillingNav } from "@/components/billing/BillingNav";
import { BillingSkeleton } from "@/components/billing/BillingSkeleton";
import { ChangeSubscriptionStatusDialog } from "@/components/billing/subscriptions/ChangeSubscriptionStatusDialog";
import { CreateSubscriptionDialog } from "@/components/billing/subscriptions/CreateSubscriptionDialog";
import { ExtendSubscriptionDialog } from "@/components/billing/subscriptions/ExtendSubscriptionDialog";
import { SubscriptionSummaryCards } from "@/components/billing/subscriptions/SubscriptionSummaryCards";
import { SubscriptionsTable } from "@/components/billing/subscriptions/SubscriptionsTable";
import { ListEmptyState } from "@/components/common/ListEmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { Button } from "@/components/ui/button";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { filterBillingItems } from "@/lib/admin/billing-normalizer";
import type { NormalizedSubscription } from "@/lib/admin/billing-types";
import {
  canManageBilling,
  useSubscriptionsQuery,
} from "@/lib/admin/use-billing-queries";
import { useParentsQuery } from "@/lib/admin/use-parents-queries";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";

export function SubscriptionsPage({
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
  const [statusTarget, setStatusTarget] = useState<NormalizedSubscription | null>(null);
  const [extendTarget, setExtendTarget] = useState<NormalizedSubscription | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const apiFilters = {
    schoolId: schoolId || undefined,
    parentId: parentId || undefined,
    status: status !== "all" ? status : undefined,
  };

  const subscriptionsQuery = useSubscriptionsQuery(apiFilters);
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
    () => filterBillingItems(subscriptionsQuery.data ?? [], { search: debouncedSearch }),
    [subscriptionsQuery.data, debouncedSearch],
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
    void subscriptionsQuery.refetch();
    setLastUpdated(new Date());
  };

  if (subscriptionsQuery.isLoading) return <BillingSkeleton />;

  if (subscriptionsQuery.isError) {
    return (
      <BillingError
        title="Subscriptions unavailable"
        message="Could not load subscriptions."
        onRetry={handleRefresh}
        isRetrying={subscriptionsQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!fixedSchoolId && !fixedParentId ? <BillingNav /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Manage parent access to camera playback
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={subscriptionsQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${subscriptionsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Subscription
            </Button>
          ) : null}
        </div>
      </div>

      <SubscriptionSummaryCards items={filtered} />

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
            { value: "ACTIVE", label: "Active" },
            { value: "TRIAL", label: "Trial" },
            { value: "PAST_DUE", label: "Past due" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "BLOCKED", label: "Blocked" },
          ]}
          showClear={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      {filtered.length === 0 ? (
        <ListEmptyState filtered={hasActiveFilters} title="No subscriptions found" />
      ) : (
        <>
          <ListResultsMeta
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            filtered={hasActiveFilters}
          />
          <SubscriptionsTable
            items={pagination.paginatedItems}
            canManage={canManage}
            onChangeStatus={setStatusTarget}
            onExtend={setExtendTarget}
          />
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

      <CreateSubscriptionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        schools={schools}
        parents={parents}
        defaultParentId={fixedParentId}
        defaultSchoolId={fixedSchoolId}
      />

      {statusTarget ? (
        <ChangeSubscriptionStatusDialog
          subscription={statusTarget}
          onClose={() => setStatusTarget(null)}
        />
      ) : null}

      {extendTarget ? (
        <ExtendSubscriptionDialog subscription={extendTarget} onClose={() => setExtendTarget(null)} />
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { ListEmptyState } from "@/components/common/ListEmptyState";
import { ListFiltersPanel } from "@/components/common/ListFiltersPanel";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { ListSearchInput } from "@/components/common/ListSearchInput";
import { ClassroomsSkeleton } from "@/components/classrooms/ClassroomsSkeleton";
import { SchoolsError } from "@/components/schools/SchoolsError";
import { ParentStatusBadge } from "@/components/parents/ParentStatusBadge";
import { PlaybackAllowedBadge } from "@/components/parents/PlaybackAllowedBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { canManageParents } from "@/lib/admin/use-classrooms-queries";
import { useParentsQuery } from "@/lib/admin/use-parents-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatTimeOnly } from "@/lib/format";
import { matchesSearch } from "@/lib/list-controls";
import { cn } from "@/lib/utils";

export function ParentsPage() {
  const { user } = useAuth();
  const canManage = canManageParents(user?.role);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const parentsQuery = useParentsQuery();

  const filtered = useMemo(() => {
    return (parentsQuery.data ?? []).filter((p) =>
      matchesSearch([p.name, p.email, p.phone, p.id], debouncedSearch),
    );
  }, [parentsQuery.data, debouncedSearch]);

  const pagination = useClientPagination(filtered, {
    resetDeps: [debouncedSearch],
  });

  const hasActiveFilters = Boolean(debouncedSearch.trim());

  const handleRefresh = () => {
    void parentsQuery.refetch();
    setLastUpdated(new Date());
  };

  if (parentsQuery.isLoading) {
    return <ClassroomsSkeleton />;
  }

  if (parentsQuery.isError) {
    return (
      <SchoolsError
        message="Could not load parents."
        onRetry={handleRefresh}
        isRetrying={parentsQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button variant="outline" onClick={handleRefresh} disabled={parentsQuery.isFetching}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${parentsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canManage ? (
            <Link href="/parents/new" className={cn(buttonVariants())}>
              <Plus className="mr-2 h-4 w-4" />
              Create Parent
            </Link>
          ) : null}
        </div>
      </div>

      <ListFiltersPanel showClear={hasActiveFilters} onClear={() => setSearch("")}>
        <ListSearchInput
          id="parents-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or phone…"
        />
      </ListFiltersPanel>

      {filtered.length === 0 ? (
        <ListEmptyState
          filtered={hasActiveFilters}
          title={hasActiveFilters ? undefined : "No parents found"}
          description={hasActiveFilters ? undefined : "Create your first parent account."}
        />
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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Children</th>
                    <th className="px-4 py-3 font-medium">Playback</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3">{p.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <ParentStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.linkedChildrenCount ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <PlaybackAllowedBadge value={p.playbackAllowed} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(p.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/parents/${p.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          View
                        </Link>
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
    </div>
  );
}

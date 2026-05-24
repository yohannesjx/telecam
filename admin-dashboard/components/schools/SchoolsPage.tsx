"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";

import { ListEmptyState } from "@/components/common/ListEmptyState";
import { ListFiltersPanel } from "@/components/common/ListFiltersPanel";
import { ListPagination } from "@/components/common/ListPagination";
import { ListResultsMeta } from "@/components/common/ListResultsMeta";
import { ListSearchInput } from "@/components/common/ListSearchInput";
import { SchoolsError } from "@/components/schools/SchoolsError";
import { SchoolsSkeleton } from "@/components/schools/SchoolsSkeleton";
import { SchoolsTable } from "@/components/schools/SchoolsTable";
import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { filterSchools } from "@/lib/admin/schools-normalizer";
import {
  canCreateSchool,
  canEditSchool,
  useSchoolsListQuery,
} from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SchoolsPage() {
  const { user } = useAuth();
  const schoolsQuery = useSchoolsListQuery();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const canCreate = canCreateSchool(user?.role);
  const canEdit = canEditSchool(user?.role);
  const hasActiveFilters = Boolean(debouncedSearch.trim()) || status !== "all";

  useEffect(() => {
    if (schoolsQuery.dataUpdatedAt) {
      setLastUpdated(new Date(schoolsQuery.dataUpdatedAt));
    }
  }, [schoolsQuery.dataUpdatedAt]);

  const filtered = useMemo(
    () => filterSchools(schoolsQuery.data ?? [], { search: debouncedSearch, status }),
    [schoolsQuery.data, debouncedSearch, status],
  );

  const pagination = useClientPagination(filtered, {
    resetDeps: [debouncedSearch, status],
  });

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
          </span>
          <Button
            variant="outline"
            onClick={() => void schoolsQuery.refetch()}
            disabled={schoolsQuery.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${schoolsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canCreate ? (
            <Link href="/schools/new" className={cn(buttonVariants())}>
              <Plus className="mr-2 h-4 w-4" />
              Create School
            </Link>
          ) : null}
        </div>
      </div>

      <ListFiltersPanel showClear={hasActiveFilters} onClear={clearFilters}>
        <div className="grid gap-4 md:grid-cols-2">
          <ListSearchInput
            id="schools-search"
            value={search}
            onChange={setSearch}
            placeholder="School name, city, timezone…"
          />
          <div className="space-y-2">
            <Label htmlFor="schools-status">Status</Label>
            <select
              id="schools-status"
              className={SELECT_CLASS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>
      </ListFiltersPanel>

      {schoolsQuery.isLoading ? (
        <SchoolsSkeleton />
      ) : schoolsQuery.isError ? (
        <SchoolsError
          onRetry={() => void schoolsQuery.refetch()}
          isRetrying={schoolsQuery.isFetching}
        />
      ) : filtered.length === 0 ? (
        <ListEmptyState
          filtered={hasActiveFilters}
          title={hasActiveFilters ? undefined : "No schools found"}
        />
      ) : (
        <>
          <ListResultsMeta
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            filtered={hasActiveFilters}
          />
          <SchoolsTable schools={pagination.paginatedItems} canEdit={canEdit} />
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

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
import { UsersTable } from "@/components/users/UsersTable";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { useUsersQuery } from "@/lib/admin/use-users-queries";
import type { ManagedUserRole, ManagedUserStatus } from "@/lib/admin/users-types";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { hasPermission } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { formatTimeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UsersPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user?.role, "users:create");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<ManagedUserRole | "">("");
  const [status, setStatus] = useState<ManagedUserStatus | "">("");
  const [schoolId, setSchoolId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const usersQuery = useUsersQuery({
    search: debouncedSearch || undefined,
    role: role || undefined,
    status: status || undefined,
    school_id: schoolId || undefined,
  });
  const schoolsQuery = useSchoolsListQuery();

  const schoolNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const school of schoolsQuery.data ?? []) {
      map[school.id] = school.name;
    }
    return map;
  }, [schoolsQuery.data]);

  const pagination = useClientPagination(usersQuery.data ?? [], {
    resetDeps: [debouncedSearch, role, status, schoolId],
  });

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || role || status || schoolId,
  );

  const handleRefresh = () => {
    void usersQuery.refetch();
    setLastUpdated(new Date());
  };

  if (usersQuery.isLoading) {
    return <ClassroomsSkeleton />;
  }

  if (usersQuery.isError) {
    return (
      <SchoolsError
        message="Could not load users."
        onRetry={handleRefresh}
        isRetrying={usersQuery.isFetching}
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
          <Button variant="outline" onClick={handleRefresh} disabled={usersQuery.isFetching}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canCreate ? (
            <Link href="/users/new" className={cn(buttonVariants())}>
              <Plus className="mr-2 h-4 w-4" />
              Create user
            </Link>
          ) : null}
        </div>
      </div>

      <ListFiltersPanel
        showClear={hasActiveFilters}
        onClear={() => {
          setSearch("");
          setRole("");
          setStatus("");
          setSchoolId("");
        }}
      >
        <ListSearchInput
          id="users-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or phone…"
        />
        <select
          className="h-9 rounded-md border px-3 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as ManagedUserRole | "")}
        >
          <option value="">All roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="SCHOOL_ADMIN">School Admin</option>
          <option value="TECHNICIAN">Technician</option>
        </select>
        <select
          className="h-9 rounded-md border px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as ManagedUserStatus | "")}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DISABLED">Disabled</option>
        </select>
        <select
          className="h-9 rounded-md border px-3 text-sm"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
        >
          <option value="">All schools</option>
          {(schoolsQuery.data ?? []).map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </ListFiltersPanel>

      {pagination.total === 0 ? (
        <ListEmptyState
          filtered={hasActiveFilters}
          title={hasActiveFilters ? undefined : "No users found"}
          description={hasActiveFilters ? undefined : "Create your first admin user."}
        />
      ) : (
        <>
          <ListResultsMeta
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            filtered={hasActiveFilters}
          />
          <UsersTable users={pagination.paginatedItems} schoolNames={schoolNames} />
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

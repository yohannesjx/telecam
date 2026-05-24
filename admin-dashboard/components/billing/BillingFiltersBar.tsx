"use client";

import { ListFiltersPanel } from "@/components/common/ListFiltersPanel";
import { ListSearchInput } from "@/components/common/ListSearchInput";

type Option = { id: string; label: string };

type BillingFiltersBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  schoolId: string;
  onSchoolIdChange: (value: string) => void;
  parentId: string;
  onParentIdChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  schools: Option[];
  parents: Option[];
  statusOptions: { value: string; label: string }[];
  method?: string;
  onMethodChange?: (value: string) => void;
  methodOptions?: { value: string; label: string }[];
  onClear?: () => void;
  showClear?: boolean;
};

const SELECT_CLASS =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function BillingFiltersBar({
  search,
  onSearchChange,
  schoolId,
  onSchoolIdChange,
  parentId,
  onParentIdChange,
  status,
  onStatusChange,
  schools,
  parents,
  statusOptions,
  method,
  onMethodChange,
  methodOptions,
  onClear,
  showClear = false,
}: BillingFiltersBarProps) {
  return (
    <ListFiltersPanel showClear={showClear} onClear={onClear}>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <ListSearchInput
          id="billing-search"
          value={search}
          onChange={onSearchChange}
          placeholder="Search by parent, school, reference…"
          showLabel={false}
          className="lg:col-span-2"
        />
        <select
          className={SELECT_CLASS}
          value={schoolId}
          onChange={(e) => onSchoolIdChange(e.target.value)}
          aria-label="Filter by school"
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLASS}
          value={parentId}
          onChange={(e) => onParentIdChange(e.target.value)}
          aria-label="Filter by parent"
        >
          <option value="">All parents</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by status"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {methodOptions && onMethodChange ? (
          <select
            className={SELECT_CLASS}
            value={method ?? "all"}
            onChange={(e) => onMethodChange(e.target.value)}
            aria-label="Filter by method"
          >
            {methodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </ListFiltersPanel>
  );
}

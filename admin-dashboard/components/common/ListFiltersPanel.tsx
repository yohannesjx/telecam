"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListFiltersPanelProps = {
  children: ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
};

export function ListFiltersPanel({
  children,
  onClear,
  showClear = false,
  className,
}: ListFiltersPanelProps) {
  return (
    <div
      className={cn(
        "surface-filter",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Filters</p>
        {showClear && onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

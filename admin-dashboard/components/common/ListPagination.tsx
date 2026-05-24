"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LIST_PAGE_SIZE_OPTIONS } from "@/lib/list-controls";
import { cn } from "@/lib/utils";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  total?: number;
  className?: string;
};

export function ListPagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  total,
  className,
}: ListPaginationProps) {
  if (totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages}
        {total != null ? ` · ${total} total` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Per page</span>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {LIST_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

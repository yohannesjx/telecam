"use client";

import { useEffect, useMemo, useState } from "react";

import {
  clampPage,
  DEFAULT_LIST_PAGE_SIZE,
  getListPageCount,
  getListRange,
  paginateArray,
  type ListPageSize,
} from "@/lib/list-controls";

type UseClientPaginationOptions = {
  pageSize?: number;
  /** Reset to page 0 when any dependency changes (e.g. filters). */
  resetDeps?: unknown[];
};

export function useClientPagination<T>(
  items: T[],
  options: UseClientPaginationOptions = {},
) {
  const initialSize = options.pageSize ?? DEFAULT_LIST_PAGE_SIZE;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialSize);

  const resetKey = JSON.stringify(options.resetDeps ?? []);
  useEffect(() => {
    setPage(0);
  }, [resetKey, items.length]);

  const total = items.length;
  const totalPages = getListPageCount(total, pageSize);
  const safePage = clampPage(page, totalPages);

  const paginatedItems = useMemo(
    () => paginateArray(items, safePage, pageSize),
    [items, safePage, pageSize],
  );

  const range = getListRange(total, safePage, pageSize);

  const setPageSizeAndReset = (size: ListPageSize | number) => {
    setPageSize(size);
    setPage(0);
  };

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize: setPageSizeAndReset,
    paginatedItems,
    total,
    totalPages,
    rangeStart: range.start,
    rangeEnd: range.end,
    hasMultiplePages: totalPages > 1,
  };
}

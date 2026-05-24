export const DEFAULT_LIST_PAGE_SIZE = 25;

export const LIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type ListPageSize = (typeof LIST_PAGE_SIZE_OPTIONS)[number];

export function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) return items;
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function getListPageCount(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return Math.max(0, Math.min(page, totalPages - 1));
}

export function getListRange(
  total: number,
  page: number,
  pageSize: number,
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const safePage = clampPage(page, getListPageCount(total, pageSize));
  const start = safePage * pageSize + 1;
  const end = Math.min(total, (safePage + 1) * pageSize);
  return { start, end };
}

export function matchesSearch(
  haystackParts: Array<string | null | undefined>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = haystackParts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(q);
}

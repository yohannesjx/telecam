/** Approximate Cloudflare R2 standard storage — estimate only. */
export const R2_STORAGE_USD_PER_GB_MONTH = 0.015;

export function estimateStorageCostUsd(bytes: number | null | undefined): number | null {
  if (bytes === null || bytes === undefined || bytes <= 0 || Number.isNaN(bytes)) return null;
  const gb = bytes / 1024 ** 3;
  return gb * R2_STORAGE_USD_PER_GB_MONTH;
}

export function estimateStorageCostUsdFromGb(gb: number | null | undefined): number | null {
  if (gb === null || gb === undefined || gb <= 0 || Number.isNaN(gb)) return null;
  return gb * R2_STORAGE_USD_PER_GB_MONTH;
}

"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SchoolsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="surface-card p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

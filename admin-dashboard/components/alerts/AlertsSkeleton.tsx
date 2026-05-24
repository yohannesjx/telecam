"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AlertsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="surface-card p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="surface-card p-4">
        <Skeleton className="mb-4 h-10 w-full" />
      </div>
      <div className="surface-card p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

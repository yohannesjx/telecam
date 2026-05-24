"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function CameraMonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="surface-card p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="surface-card p-4">
        <Skeleton className="mb-4 h-10 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

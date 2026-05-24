"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ClassroomsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

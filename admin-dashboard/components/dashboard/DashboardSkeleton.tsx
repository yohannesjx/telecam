"use client";

import { StatCardsSkeleton, LoadingState } from "@/components/ui/loading-state";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <StatCardsSkeleton count={16} />
      <div className="grid gap-6 lg:grid-cols-2">
        <LoadingState className="min-h-[280px]" />
        <LoadingState className="min-h-[280px]" />
      </div>
      <LoadingState className="min-h-[160px]" />
    </div>
  );
}

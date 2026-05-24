import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { surfaceCard } from "@/lib/ui/surface";

type LoadingStateProps = {
  variant?: "card" | "table" | "inline";
  rows?: number;
  className?: string;
};

export function LoadingState({
  variant = "card",
  rows = 5,
  className,
}: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-slate-500", className)}>
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("overflow-hidden", surfaceCard, className)}>
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(surfaceCard, "space-y-3 p-5", className)}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingState key={i} />
      ))}
    </div>
  );
}

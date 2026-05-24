"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils";

type DashboardErrorProps = {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
};

export function DashboardError({
  message = "Could not load dashboard overview.",
  onRetry,
  isRetrying = false,
}: DashboardErrorProps) {
  return (
    <div className={cn(surfaceCard, "border-red-200/60 p-8 text-center")}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-sm font-semibold text-slate-900">Dashboard unavailable</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{message}</p>
      <Button
        variant="outline"
        className="mt-5 border-slate-200"
        onClick={onRetry}
        disabled={isRetrying}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
        {isRetrying ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}

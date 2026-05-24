"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fadeUpVariants, motionTransition } from "@/lib/ui/animations";
import { surfaceCard } from "@/lib/ui/surface";

type EmptyStateProps = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  filtered?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  filtered = false,
  actionLabel,
  onAction,
  clearFiltersLabel = "Clear filters",
  onClearFilters,
  className,
}: EmptyStateProps) {
  const defaultTitle = filtered ? "No results match your filters" : "Nothing here yet";
  const defaultDescription = filtered
    ? "Try adjusting search or filters to find what you need."
    : "Records will appear here when data is available.";

  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      transition={motionTransition}
      className={cn(surfaceCard, "px-6 py-12 text-center", className)}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-900">{title ?? defaultTitle}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        {description ?? defaultDescription}
      </p>
      {(onAction || (filtered && onClearFilters)) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {onAction && actionLabel ? (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
          {filtered && onClearFilters ? (
            <Button size="sm" variant="outline" onClick={onClearFilters}>
              {clearFiltersLabel}
            </Button>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}

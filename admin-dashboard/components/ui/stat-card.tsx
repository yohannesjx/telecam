"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { fadeUpVariants, motionTransition } from "@/lib/ui/animations";
import { surfaceCard, surfaceCardHover } from "@/lib/ui/surface";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  progress?: number;
  featured?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  badge,
  progress,
  featured = false,
  className,
}: StatCardProps) {
  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      transition={motionTransition}
      className={cn(
        surfaceCard,
        surfaceCardHover,
        "p-5",
        featured &&
          "relative overflow-hidden bg-gradient-to-br from-white via-white to-indigo-50/60 ring-1 ring-indigo-100/80",
        className,
      )}
    >
      {featured ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-100/40 blur-2xl"
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p
            className={cn(
              "font-semibold tracking-tight text-slate-900",
              featured ? "text-3xl" : "text-2xl",
            )}
          >
            {value}
          </p>
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              featured
                ? "bg-indigo-100 text-indigo-600"
                : "bg-slate-100 text-slate-500",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      {typeof progress === "number" ? (
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}

      {(hint || badge) && (
        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          {badge}
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
      )}
    </motion.div>
  );
}

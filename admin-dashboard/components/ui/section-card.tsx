"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { fadeUpVariants, motionTransition } from "@/lib/ui/animations";
import { surfaceCard } from "@/lib/ui/surface";

type SectionCardProps = {
  title?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  animate?: boolean;
};

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  animate = true,
}: SectionCardProps) {
  const Wrapper = animate ? motion.section : "section";

  return (
    <Wrapper
      {...(animate
        ? {
            variants: fadeUpVariants,
            initial: "hidden",
            animate: "visible",
            transition: motionTransition,
          }
        : {})}
      className={cn(surfaceCard, "overflow-hidden", className)}
    >
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </Wrapper>
  );
}

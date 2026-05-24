"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  fadeUpVariants,
  motionTransition,
  staggerContainerVariants,
} from "@/lib/ui/animations";

type MotionFadeInProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function MotionFadeIn({ children, className, delay = 0 }: MotionFadeInProps) {
  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      transition={{ ...motionTransition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type MotionStaggerProps = {
  children: React.ReactNode;
  className?: string;
};

export function MotionStagger({ children, className }: MotionStaggerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: "lift" | "glow" | "none";
  delay?: number;
  padding?: string;
}

export function GlassCard({ children, className, hover = "lift", delay = 0, padding = "p-6" }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={
        hover === "lift"
          ? { y: -2, transition: { duration: 0.2 } }
          : hover === "glow"
          ? { boxShadow: "0 0 24px rgba(99, 102, 241, 0.15)", transition: { duration: 0.2 } }
          : undefined
      }
      className={cn(
        "rounded-2xl bg-card border border-border/50 shadow-sm",
        padding,
        "transition-shadow duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
